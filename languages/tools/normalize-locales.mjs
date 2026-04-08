/**
 * Align locale JSON to en_DK structure, strip orphan keys, apply manual strings,
 * machine-translate remaining English (value === en_DK) via Google gtx.
 *
 * Run: node languages/tools/normalize-locales.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LANG_DIR = path.resolve(__dirname, "..")
const REF_NAME = "en_DK.json"

const LOCALE_TO_TL = {
	cs_CZ: "cs",
	da_DK: "da",
	de_DE: "de",
	el_GR: "el",
	es_AR: "es",
	es_ES: "es",
	es_MX: "es",
	fi_FI: "fi",
	fr_FR: "fr",
	hr_HR: "hr",
	hu_HU: "hu",
	it_IT: "it",
	nl_NL: "nl",
	no_NO: "no",
	pl_PL: "pl",
	pt_BR: "pt",
	pt_PT: "pt",
	ro_RO: "ro",
	ru_RU: "ru",
	sk_SK: "sk",
	sl_SI: "sl",
	sr_RS: "sr",
	sv_SE: "sv",
	tr_TR: "tr",
	uk_UA: "uk",
}

function flatten(obj, prefix = "") {
	const out = {}
	if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
		out[prefix || "_root"] = obj
		return out
	}
	for (const k of Object.keys(obj)) {
		const p = prefix ? `${prefix}.${k}` : k
		Object.assign(out, flatten(obj[k], p))
	}
	return out
}

function buildBranch(tplBranch, flatValues, pathPrefix) {
	if (tplBranch === null || typeof tplBranch !== "object" || Array.isArray(tplBranch)) {
		const v = flatValues[pathPrefix]
		return v !== undefined ? v : tplBranch
	}
	const out = {}
	for (const k of Object.keys(tplBranch)) {
		const subPath = `${pathPrefix}.${k}`
		out[k] = buildBranch(tplBranch[k], flatValues, subPath)
	}
	return out
}

function unflattenFromTemplate(template, flatValues) {
	if (template === null || typeof template !== "object" || Array.isArray(template)) {
		return flatValues[""] !== undefined ? flatValues[""] : template
	}
	const out = {}
	for (const k of Object.keys(template)) {
		out[k] = buildBranch(template[k], flatValues, k)
	}
	return out
}

function protectPlaceholders(s) {
	const tokens = []
	let i = 0
	let out = s.replace(/\$[a-zA-Z0-9_]+\$/g, (m) => {
		const tag = `@@@PH_${i++}@@@`
		tokens.push({ tag, val: m })
		return tag
	})
	out = out.replace(/\{[^}]+\}/g, (m) => {
		const tag = `@@@PH_${i++}@@@`
		tokens.push({ tag, val: m })
		return tag
	})
	return { text: out, tokens }
}

function restorePlaceholders(s, tokens) {
	let out = s
	for (const { tag, val } of tokens) {
		out = out.split(tag).join(val)
	}
	return out
}

async function gtxTranslate(text, tl) {
	if (!text || !tl) return text
	const { text: protectedText, tokens } = protectPlaceholders(text)
	const enc = encodeURIComponent(protectedText)
	let lastErr
	for (let attempt = 0; attempt < 6; attempt++) {
		try {
			const url =
				"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
				encodeURIComponent(tl) +
				"&dt=t&q=" +
				enc
			const res = await fetch(url, {
				headers: { "User-Agent": "Mozilla/5.0 (compatible; ClothCalc-locale-sync/1.0)" },
			})
			if (!res.ok) {
				lastErr = new Error(`HTTP ${res.status}`)
				await sleep(400 * (attempt + 1))
				continue
			}
			const data = await res.json()
			const translated = data?.[0]?.map((x) => x[0]).join("") ?? protectedText
			return restorePlaceholders(translated, tokens)
		} catch (e) {
			lastErr = e
			await sleep(400 * (attempt + 1))
		}
	}
	throw lastErr
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

const CHURCH_LVL_POINTS = {
	en_DK: "Show church level and labor points on player profiles",
	cs_CZ: "Zobrazit úroveň kostela a pracovní body v profilech hráčů",
	da_DK: "Vis kirkeniveau og arbejdspoint på spillerprofiler",
	de_DE: "Kirchenstufe und Arbeitspunkte in Spielerprofilen anzeigen",
	el_GR: 'Εμφάνιση των "καλύτερων" επιπέδων Εκκλησίας στα προφίλ παικτών',
	es_AR: "Mostrar nivel de iglesia y puntos de trabajo en perfiles de jugadores",
	es_ES: "Mostrar nivel de iglesia y puntos de trabajo en perfiles de jugadores",
	es_MX: "Mostrar nivel de iglesia y puntos de trabajo en perfiles de jugadores",
	fi_FI: "Näytä kirkon taso ja työpisteet pelaajaprofiileissa",
	fr_FR: "Afficher le niveau de l'église et les points de travail sur les profils des joueurs",
	hr_HR: "Prikaži razinu crkve i radne bodove na profilima igrača",
	hu_HU: "Templom szint és munkapontok megjelenítése játékosprofilokon",
	it_IT: "Mostra livello chiesa e punti lavoro nei profili giocatore",
	nl_NL: "Kerkniveau en arbeidspunten op spelersprofielen tonen",
	no_NO: "Vis kirkenivå og arbeidspoeng på spillerprofiler",
	pl_PL: "Pokaż poziom kościoła i punkty pracy w profilach graczy",
	pt_BR: "Mostrar nível da igreja e pontos de trabalho nos perfis dos jogadores",
	pt_PT: "Mostrar nível da igreja e pontos de trabalho nos perfis dos jogadores",
	ro_RO: "Afișează nivelul bisericii și punctele de muncă în profilurile jucătorilor",
	ru_RU: "Показывать уровень церкви и очки труда в профилях игроков",
	sk_SK: "Zobraziť úroveň kostola a pracovné body v profiloch hráčov",
	sl_SI: "Prikaži nivo cerkve in delovne točke v profilih igralcev",
	sr_RS: "Prikaži nivo crkve i radne poene na profilima igrača",
	sv_SE: "Visa kyrkonivå och arbetspoäng på spelarprofiler",
	tr_TR: "Oyuncu profillerinde kilise seviyesi ve iş puanlarını göster",
	uk_UA: "Показувати рівень церкви та очки праці в профілях гравців",
}

const ENERGY_PREM_OFF = {
	en_DK: "Disable notifications for purchasing Premium Energy",
	cs_CZ: "Vypnout upozornění na nákup prémiové energie",
	da_DK: "Deaktivér meddelelser om køb af Premium-energi",
	de_DE: "Benachrichtigungen zum Kauf von Premium-Energie deaktivieren",
	el_GR: "Απενεργοποίηση ειδοποιήσεων για την αγορά Premium Ενέργειας",
	es_AR: "Desactivar notificaciones por comprar energía premium",
	es_ES: "Desactivar notificaciones por comprar energía premium",
	es_MX: "Desactivar notificaciones por comprar energía premium",
	fi_FI: "Poista ilmoitukset premium-energian ostosta käytöstä",
	fr_FR: "Désactiver les notifications d'achat d'énergie premium",
	hr_HR: "Isključi obavještenja o kupnji premium energije",
	hu_HU: "Prémium energia vásárlására vonatkozó értesítések kikapcsolása",
	it_IT: "Disabilita le notifiche per l'acquisto di energia premium",
	nl_NL: "Meldingen voor aankoop van premium energie uitschakelen",
	no_NO: "Deaktiver varsler om kjøp av premium energi",
	pl_PL: "Wyłącz powiadomienia o zakupie premium energii",
	pt_BR: "Desativar notificações de compra de energia premium",
	pt_PT: "Desativar notificações de compra de energia premium",
	ro_RO: "Dezactivează notificările pentru cumpărarea energiei premium",
	ru_RU: "Отключить уведомления о покупке премиум-энергии",
	sk_SK: "Vypnúť upozornenia na nákup prémiovej energie",
	sl_SI: "Onemogoči obvestila o nakupu premium energije",
	sr_RS: "Isključi obaveštenja o kupovini premium energije",
	sv_SE: "Inaktivera aviseringar om köp av premiumenergi",
	tr_TR: "Premium enerji satın alma bildirimlerini kapat",
	uk_UA: "Вимкнути сповіщення про купівлю преміум-енергії",
}

async function main() {
	const refPath = path.join(LANG_DIR, REF_NAME)
	const refObj = JSON.parse(fs.readFileSync(refPath, "utf8"))
	const refFlatAll = flatten(refObj)
	const refKeys = new Set(Object.keys(refFlatAll))

	const files = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith(".json") && f !== REF_NAME)

	for (const fname of files.sort()) {
		const locale = fname.replace(".json", "")
		const tl = LOCALE_TO_TL[locale]
		if (!tl) {
			console.warn("Skip unknown locale:", fname)
			continue
		}

		const fpath = path.join(LANG_DIR, fname)
		let locFlat = flatten(JSON.parse(fs.readFileSync(fpath, "utf8")))

		const stripped = {}
		for (const k of Object.keys(locFlat)) {
			if (refKeys.has(k)) stripped[k] = locFlat[k]
		}
		locFlat = stripped

		for (const k of Object.keys(refFlatAll)) {
			if (locFlat[k] === undefined) locFlat[k] = refFlatAll[k]
		}

		locFlat["settings.church_lvl_points"] = CHURCH_LVL_POINTS[locale] ?? CHURCH_LVL_POINTS.en_DK
		locFlat["settings.energy_prem_off"] = ENERGY_PREM_OFF[locale] ?? ENERGY_PREM_OFF.en_DK

		const refFresh = JSON.parse(fs.readFileSync(refPath, "utf8"))
		const refFlatFresh = flatten(refFresh)

		let translated = 0
		let failed = 0
		for (const key of Object.keys(refFlatFresh)) {
			const refVal = refFlatFresh[key]
			if (typeof refVal !== "string") continue
			let v = locFlat[key]
			if (typeof v !== "string") v = refVal
			if (v === refVal) {
				try {
					v = await gtxTranslate(refVal, tl)
					translated++
				} catch (e) {
					console.warn(fname, key, e.message)
					failed++
					v = refVal
				}
				await sleep(100)
			}
			locFlat[key] = v
		}
		if (failed) console.warn(fname, "translate failures:", failed)

		const rebuilt = unflattenFromTemplate(refFresh, locFlat)
		fs.writeFileSync(fpath, JSON.stringify(rebuilt, null, "\t") + "\n", "utf8")
		console.log("OK", fname, "gtx calls:", translated)
	}

	console.log("Done.")
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
