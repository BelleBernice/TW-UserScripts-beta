/**
 * Re-translate strings where $placeholders$ were corrupted by MT (use ASCII markers).
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

function tokens(s) {
	if (typeof s !== "string") return []
	const m = s.match(/\$[a-zA-Z0-9_]+\$|%[sd]|%[0-9]*\$[sd]|\{[a-zA-Z0-9_$]+\}/g)
	return m || []
}

function protectPlaceholders(s) {
	const tok = []
	let i = 0
	// Use @@@PH_n@@@ — survives Cyrillic/Greek MT better than __TWPH__ (not transliterated).
	let out = s.replace(/\$[a-zA-Z0-9_]+\$/g, (m) => {
		const tag = `@@@PH_${i++}@@@`
		tok.push({ tag, val: m })
		return tag
	})
	out = out.replace(/\{[^}]+\}/g, (m) => {
		const tag = `@@@PH_${i++}@@@`
		tok.push({ tag, val: m })
		return tag
	})
	return { text: out, tok }
}

function restorePlaceholders(s, tok) {
	let out = s
	for (const { tag, val } of tok) {
		out = out.split(tag).join(val)
	}
	return out
}

async function gtxTranslate(text, tl) {
	if (!text || !tl) return text
	const { text: prot, tok } = protectPlaceholders(text)
	const enc = encodeURIComponent(prot)
	for (let attempt = 0; attempt < 6; attempt++) {
		try {
			const url =
				"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
				encodeURIComponent(tl) +
				"&dt=t&q=" +
				enc
			const res = await fetch(url, {
				headers: { "User-Agent": "Mozilla/5.0 (compatible; ClothCalc-locale-sync/1.1)" },
			})
			if (!res.ok) {
				await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
				continue
			}
			const data = await res.json()
			const translated = data?.[0]?.map((x) => x[0]).join("") ?? prot
			return restorePlaceholders(translated, tok)
		} catch {
			await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
		}
	}
	return restorePlaceholders(prot, tok)
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

async function main() {
	const refPath = path.join(LANG_DIR, REF_NAME)
	const refObj = JSON.parse(fs.readFileSync(refPath, "utf8"))
	const refFlat = flatten(refObj)

	const files = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith(".json") && f !== REF_NAME)

	for (const fname of files.sort()) {
		const locale = fname.replace(".json", "")
		const tl = LOCALE_TO_TL[locale]
		if (!tl) continue

		const fpath = path.join(LANG_DIR, fname)
		const locFlat = flatten(JSON.parse(fs.readFileSync(fpath, "utf8")))
		let fixed = 0

		for (const key of Object.keys(refFlat)) {
			const en = refFlat[key]
			if (typeof en !== "string" || typeof locFlat[key] !== "string") continue
			const a = tokens(en).sort().join(",")
			const b = tokens(locFlat[key]).sort().join(",")
			if (a === b) continue
			if (!tokens(en).length) continue
			locFlat[key] = await gtxTranslate(en, tl)
			fixed++
			await sleep(80)
		}

		const rebuilt = unflattenFromTemplate(refObj, locFlat)
		fs.writeFileSync(fpath, JSON.stringify(rebuilt, null, "\t") + "\n", "utf8")
		console.log(fname, "fixed", fixed)
	}
	console.log("Done repair.")
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
