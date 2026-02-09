// ==UserScript==
// @name The West - TW-DB.info Cloth Calc [Multi-Lang] - BB
// @namespace    https://github.com/BelleBernice/TW-UserScripts-beta
// @version 0.29.0
// @description The West Script: Cloth Calculation for game version 1.34 or higher
// @author [tw-db.info] Team, Belle Bernice
// @homepageURL  https://BelleBernice.github.io/TW-UserScripts-beta
// @supportURL   https://github.com/BelleBernice/TW-UserScripts-beta/issues
// @source       https://github.com/BelleBernice/TW-UserScripts-beta
// @icon         https://raw.githubusercontent.com/BelleBernice/TW-UserScripts-beta/main/TW-ClothCalc-MultiLang-BB/assets/icon.png
// @include http://*.the-west.*/game.php*
// @include https://*.the-west.*/game.php*
// @include http://*.tw.innogames.*/game.php*
// @include https://*.tw.innogames.*/game.php*
// @grant GM_info
// @downloadURL https://update.greasyfork.org/scripts/559600/The%20West%20-%20TW-DBinfo%20Cloth%20Calc%20%5BMulti-Lang%5D%20-%20BB.user.js
// @updateURL https://update.greasyfork.org/scripts/559600/The%20West%20-%20TW-DBinfo%20Cloth%20Calc%20%5BMulti-Lang%5D%20-%20BB.meta.js
// ==/UserScript==

/**
 * Inject into page context so we can access The West globals.
 * Userscripts often run in a sandbox; this forces execution in the page scope.
 */
;(function (f) {
	const d = document
	const s = d.createElement("script")
	s.setAttribute("type", "application/javascript")
	s.textContent = `(${f.toString()})()`
	;(d.body || d.head || d.documentElement).appendChild(s)
	s.parentNode.removeChild(s)
})(function () {
	if (isDefined(window.TWDB)) {
		// Ensure Language is available if TWDB already exists
		if (!window.Language && TWDB.lang) {
			window.Language = TWDB.lang
		}
		new west.gui.Dialog(
			TWDB.script.name,
			`<div class="txcenter"><b><br>${Language._("script.duplicate_installation")}</br></b></div>`,
			west.gui.Dialog.SYS_WARNING
		)
			.addButton(Language._("common.ok"))
			.show()
	} else {

TWDB = {}
// Get locale from Game.locale, fallback to "el_GR" if not available
const detectedLocale = typeof Game !== "undefined" && Game.locale ? Game.locale : "el_GR"

TWDB.script = new Object({
	version: typeof GM_info !== "undefined" ? GM_info.script.version : "0.29.0",
	name: "The West - TW-DB.info Cloth Calc [Multi-Lang] - BB",
	name_max: "The%20West%20-%20TW-DBinfo%20Cloth%20Calc%20%5BMulti-Lang%5D%20-%20BB",
	name_min: "clothcalc",
	folder_url: "BelleBernice.github.io/TW-UserScripts-beta/TW-ClothCalc-MultiLang-BB/",
	update_suffix: ".user.js",
	update_link: "update.greasyfork.org/scripts/559600/",
	check: "version.js",
	url: "TW-DB.info",
	protocol: location.protocol.match(/^(.+):$/)[1],
	game_version: "2.256.3",
	gameLocale: detectedLocale,
	langs: {
		[detectedLocale]: `${detectedLocale}.json`,
	},
	preferences: {
		lang: null,
	},
})
TWDB.lang = {}
/**
 * Translate a dotted key against the loaded locale object.
 *
 * Supports:
 * - default fallback value
 * - `$name$` style substitutions via a params object
 *
 * @param {string} key
 * @param {string|Object<string,string>|null} [defaultValueOrParams]
 * @param {Object<string,string>} [parameters]
 * @returns {string}
 */
TWDB.lang._ = function (key, defaultValueOrParams, parameters) {
	let defaultValue = null
	if (
		typeof defaultValueOrParams === "object" &&
		defaultValueOrParams !== null &&
		!Array.isArray(defaultValueOrParams)
	) {
		parameters = defaultValueOrParams
	} else {
		defaultValue = defaultValueOrParams
	}
	const keys = key.split(".")
	let translation = TWDB.lang
	for (let i = 0; i < keys.length; i++) {
		if (translation && typeof translation === "object" && keys[i] in translation) {
			translation = translation[keys[i]]
		} else {
			translation = null
			break
		}
	}
	let result = translation || defaultValue || key
	if (!translation && !defaultValue && TWDB.script?.isDev?.()) {
		console.warn(`Missing translation for key: "${key}"`)
	}
	if (typeof parameters !== "undefined" && parameters !== null) {
		for (const paramName of Object.keys(parameters)) {
			result = result.replace(new RegExp(`\\$${paramName}\\$`, "g"), parameters[paramName])
		}
	}
	return result
}
// Initialize Language as an alias to TWDB.lang for early availability
window.Language = TWDB.lang
TWDB.images = {}


/**
 * Resource loader for langs/images/changelog.
 *
 * Loads JSON resources from GitHub (raw) with fallback URLs and emits TWDB*Loaded events.
 */
TWDB.ResourceLoader = (function () {
	const protocol = TWDB.script.protocol === "https" ? "https" : "http"
	const repoPath = "BelleBernice/TW-UserScripts-beta/main/TW-ClothCalc-MultiLang-BB"

	/**
	 * Build a GitHub raw URL with the current protocol.
	 * @param {string} path
	 * @returns {string}
	 */
	function buildGitHubRawUrl(path) {
		return `${protocol}://raw.githubusercontent.com/${path}`
	}

	// Resource configuration - easy to extend with new resource types
	const resourceConfig = {
		langs: {
			path: "languages",
			files: TWDB.script.langs, // { en_EN: "en_EN.json", el_GR: "el_GR.json" }
			defaultValue: {},
			parser: "json",
		},
		errors: {
			path: "languages/errors",
			filename: "log.json",
			defaultValue: {},
			parser: "json",
		},
		images: {
			path: "assets",
			filename: "images.json",
			defaultValue: {},
			parser: "json",
		},
	}

	/**
	 * Load a resource by type, optionally keyed by locale.
	 * @param {"languages"|"errors"|"assets"} type
	 * @param {string|null} key
	 * @param {(data:any)=>void} [onSuccess]
	 * @param {()=>void} [onFail]
	 * @returns {void}
	 */
	function loadResource(type, key, onSuccess, onFail) {
		const config = resourceConfig[type]
		if (!config) {
			if (onFail) onFail()
			return
		}

		let filename, defaultValue
		if (config.files && key) {
			// For resources with multiple files (like langs or notes)
			// Construct filename from key: {key}.json
			filename = `${key}.json`
			defaultValue = config.defaultValue
		} else if (config.filename) {
			// For single-file resources
			filename = config.filename
			defaultValue = config.defaultValue
		} else {
			// No filename configured
			if (onFail) onFail()
			return
		}

		const urls = [
			buildGitHubRawUrl(`${repoPath}/${config.path}/${filename}`),
			buildGitHubRawUrl(`${TWDB.script.folder_url}${config.path}/${filename}`),
		]

		let currentIndex = 0

		function tryLoad() {
			if (currentIndex >= urls.length) {
				// All URLs failed - show error for language files
				if (type === "languages" && key) {
					if (typeof UserMessage !== "undefined") {
						new UserMessage(
							Language._("errors.language_file_not_found", { filename, locale: key }),
							UserMessage.TYPE_ERROR
						).show()
					} else {
						const errorMsg = Language._("errors.language_file_not_found_console", {
							filename,
							locale: key,
						})
						const error = new Error(errorMsg)
						ErrorModule.report(error, Language._("errors.language_file_loading"))
					}
				}
				// Call onFail, or if defaultValue exists, use it as fallback
				if (onFail) {
					onFail()
				} else if (defaultValue !== undefined && onSuccess) {
					// Use defaultValue as fallback if onFail is not provided
					onSuccess(defaultValue)
				}
				return
			}

			if (config.parser === "json") {
				$.getJSON(urls[currentIndex], function (data) {
					if (onSuccess) onSuccess(data)
				}).fail(function () {
					currentIndex++
					tryLoad()
				})
			} else if (config.parser === "image") {
				// For future image loading
				const img = new Image()
				img.onload = function () {
					if (onSuccess) onSuccess(img)
				}
				img.onerror = function () {
					currentIndex++
					tryLoad()
				}
				img.src = urls[currentIndex]
			} else {
				// Default: try as JSON
				$.getJSON(urls[currentIndex], function (data) {
					if (onSuccess) onSuccess(data)
				}).fail(function () {
					currentIndex++
					tryLoad()
				})
			}
		}

		tryLoad()
	}

	return {
		load: loadResource,
		config: resourceConfig,
	}
})()


// Changelog will be loaded from language file, initialized here
TWDB.script.notes = []

TheWestApi.version = Game.version = parseInt(Game.version, 10)
	? Game.version
	: TWDB.script.game_version
TWDB.script.game_version = Game.version
TWDB.script.isDev = function () {
	return this.check.search("dev_version") !== -1
}
// biome-ignore lint/correctness/noUnusedVariables: <>
function round(num, decimals = 0) {
	const factor = 10 ** decimals
	return Math.round((num + Number.EPSILON) * factor) / factor
}
// biome-ignore lint/correctness/noUnusedVariables: <>
const twiceHTMLUnescape = str => {
	const el = document.createElement("textarea")
	el.innerHTML = str //once
	el.innerHTML = el.value //twice
	return el.value
}
window.debLog =
	TWDB.script.isDev() && console?.info ? (...args) => console.info("CC:", ...args) : () => {}

// Initialize language preferences
if (localStorage.getItem("TWDB_preferences")) {
	const storage = JSON.parse(localStorage.getItem("TWDB_preferences"))
	for (const key in TWDB.script.preferences) {
		if (storage[key] === undefined) {
			storage[key] = TWDB.script.preferences[key]
		}
	}
	TWDB.script.preferences = storage
}

// Determine language - use Game.locale or fallback to el_GR
TWDB.script.preferences.lang =
	TWDB.script.preferences.lang == null ? TWDB.script.gameLocale : TWDB.script.preferences.lang

const triggerLangLoaded = function () {
	if (TWDB.Eventer && typeof TWDB.Eventer.trigger === "function") {
		TWDB.Eventer.trigger("TWDBLangLoaded")
	}
}

// Unified language loading function
function loadLanguage(langCode, options) {
	options = options || {}
	const previousLang = options.previousLang
	// const showSuccessMessage = options.showSuccessMessage || false
	const onComplete = options.onComplete || function () {}

	TWDB.ResourceLoader.load(
		"langs",
		langCode,
		function (translation) {
			// Extract changelog and metadata before merging (both are top-level)
			const changelog = translation?.changelog || []
			const metadata = translation?.metadata || {}
			delete translation.changelog // Remove from translation object
			delete translation.metadata // Remove from translation object

			// Success: update language
			// Merge translation into TWDB.lang to preserve TWDB.lang._()
			if (translation && typeof translation === "object") {
				// Avoid accidentally overwriting the translator function if a locale file ever contains "_" key
				const translateFn = TWDB.lang?._
				Object.assign(TWDB.lang, translation)
				if (translateFn) TWDB.lang._ = translateFn
			}

			// Set notes from changelog (unchanged from Phase 1)
			TWDB.script.notes = changelog

			// Store metadata for potential use
			TWDB.script.translationMetadata = metadata

			// Load errors and merge into TWDB.lang
			TWDB.ResourceLoader.load(
				"errors",
				null,
				function (errorsData) {
					// Merge errors into TWDB.lang
					if (errorsData && typeof errorsData === "object" && errorsData.errors) {
						Object.assign(TWDB.lang, { errors: errorsData.errors })
					}
					// Keep Language pointing to TWDB.lang (which owns _)
					window.Language = TWDB.lang
					triggerLangLoaded()
					onComplete()
				},
				function () {
					// Errors failed to load, continue anyway
					// Keep Language pointing to TWDB.lang (which owns _)
					window.Language = TWDB.lang
					triggerLangLoaded()
					onComplete()
				}
			)
		},
		function () {
			// Error: fall back to previous language or gameLocale
			const fallbackLang = previousLang || TWDB.script.gameLocale

			// Only try fallback if it's different from what we just tried
			if (fallbackLang !== langCode) {
				// Update preferences to fallback
				TWDB.script.preferences.lang = fallbackLang
				localStorage.setItem("TWDB_preferences", JSON.stringify(TWDB.script.preferences))

				// Try loading fallback (silently, no message)
				loadLanguage(fallbackLang, {
					previousLang: null,
					showSuccessMessage: false,
					onComplete: onComplete,
				})
			} else {
				// No fallback available, use default structure
				triggerLangLoaded()
				onComplete()
			}
		}
	)
}
loadLanguage(TWDB.script.preferences.lang, { previousLang: null })

// Load images
TWDB.ResourceLoader.load(
	"images",
	null,
	function (images) {
		// Update properties instead of replacing object to maintain reference
		if (images && typeof images === "object") {
			Object.assign(TWDB.images, images)
			// Trigger event to notify that images are loaded
			if (TWDB.Eventer && typeof TWDB.Eventer.trigger === "function") {
				TWDB.Eventer.trigger("TWDBImagesLoaded")
			}
		}
	},
	function () {
		// Log error and retry once after a delay
		if (typeof ErrorModule !== "undefined" && ErrorModule.report) {
			ErrorModule.report(
				new Error(Language._("errors.images_json_load_error")),
				Language._("errors.images_load_retry")
			)
		}
		setTimeout(function () {
			TWDB.ResourceLoader.load(
				"images",
				null,
				function (images) {
					if (images && typeof images === "object") {
						Object.assign(TWDB.images, images)
						if (TWDB.Eventer && typeof TWDB.Eventer.trigger === "function") {
							TWDB.Eventer.trigger("TWDBImagesLoaded")
						}
					}
				},
				function () {
					if (typeof ErrorModule !== "undefined" && ErrorModule.report) {
						ErrorModule.report(
							new Error(Language._("errors.images_load_failed_retry")),
							Language._("errors.images_load_failed_retry")
						)
					}
				}
			)
		}, 1000)
	}
)


/**
 * Small DOM/storage helpers used across modules.
 * @namespace
 */
TWDB.Util = (function ($) {
	const util = {}
	const addCssImplementation = function (cssText, suffix) {
		let cssIdPrefix = "twdb_css"
		if (typeof suffix !== "undefined" && typeof suffix === "string") {
			cssIdPrefix += `_${suffix.replace(/\W+/g, "")}`
		}
		if ($(`head style#${cssIdPrefix}`).append(`<br />${cssText}`).length === 1) {
			return
		} else {
			$("head").append($(`<style type="text/css" id="${cssIdPrefix}">`).text(cssText))
		}
	}
	/**
	 * Append CSS to the page (deduped by a stable `<style id="twdb_css[_suffix]">`).
	 * @param {string} cssText
	 * @param {string} [suffix] Optional ID suffix to isolate style buckets.
	 * @returns {void}
	 */
	util.addCss = function (cssText, suffix) {
		return addCssImplementation(cssText, suffix)
	}
	const backupDataImplementation = function () {
		const backupItems = []
		let key
		const localStoragePrefix = `twdb_${Character.playerId}_`
		let index
		if (localStorage.getItem(`${localStoragePrefix}embackup`) === true) {
			return
		}
		for (index = 0; index < localStorage.length; index++) {
			key = localStorage.key(index)
			if (
				key.search(localStoragePrefix) === 0 &&
				key.search(/(marketreminder|notes|settings|statistic)$/i) !== -1
			) {
				backupItems.push({
					key: key,
					newKey: `backup_${key}`,
					value: localStorage.getItem(key),
				})
			}
		}
		for (index = 0; index < backupItems.length; index++) {
			localStorage.setItem(backupItems[index].newKey, backupItems[index].value)
			console.log(
				Language._("debug.key_saved", {
					key: backupItems[index].key.substr(localStoragePrefix.length),
				})
			)
		}
		localStorage.setItem(`${localStoragePrefix}embackup`, true)
	}
	/**
	 * One-time backup of selected TWDB localStorage keys to `backup_*` keys.
	 * @returns {void}
	 */
	util.backupData = function () {
		return backupDataImplementation()
	}
	/**
	 * querySelector wrapper that accepts Node/jQuery/CSS selector as the parent context.
	 * @param {string} selector
	 * @param {Node|jQuery|string|{querySelector:Function}|null} [parentContext]
	 * @returns {Element|null}
	 */
	util.query = function (selector, parentContext) {
		if (!parentContext) {
			return document.querySelector(selector)
		}
		if (parentContext instanceof Node) {
			return parentContext.querySelector(selector)
		}
		if (parentContext instanceof jQuery) {
			return parentContext.length ? parentContext[0].querySelector(selector) : null
		}
		if (
			typeof parentContext === "object" &&
			parentContext !== null &&
			"querySelector" in parentContext
		) {
			return parentContext.querySelector(selector)
		}
		if (typeof parentContext === "string") {
			const resolvedParent = TWDB.Util.query(parentContext)
			return resolvedParent ? resolvedParent.querySelector(selector) : null
		}
		return null
	}
	return util
})(jQuery)


/**
 * Core ClothCalc state + data fetchers (bids/recipes) + bootstrap.
 * @namespace
 */
TWDB.ClothCalc = {
	calcdata: {
		skills: {},
		items: {},
		jobs: {},
		custom: {},
		animals: [],
		used: {},
		loaded: false,
	},
	ready: false,
	bidsLoading: false,
	bids: {},
	/**
	 * Cache user's active market bids (used for UI hints and filtering).
	 * @returns {void}
	 */
	getBids: function () {
		if (this.bidsLoading) return
		this.bidsLoading = true
		const self = this
		Ajax.remoteCall("building_market", "fetch_bids", {}, function (response) {
			if (response.error) return new UserMessage(response.msg, UserMessage.TYPE_ERROR).show()
			const searchResult = response.msg.search_result
			for (let index = 0; index < searchResult.length; index++) {
				self.bids[searchResult[index].item_id] = 1
			}
			self.bidsLoading = false
		})
	},
	recLoading: false,
	recipes: {},
	/**
	 * Cache learned crafting recipes (affects craftability/filters).
	 * @returns {void}
	 */
	getLearned: function () {
		if (this.recLoading) return
		this.recLoading = true
		const self = this
		Ajax.remoteCall("crafting", "", {}, function (response) {
			const recipesContent = response.recipes_content
			if (recipesContent)
				for (let index = 0; index < recipesContent.length; index++)
					self.recipes[recipesContent[index].item_id] = 1
			self.recLoading = false
		})
	},
	/**
	 * Prime calc state, register hooks, and load cached calcdata if available.
	 * @returns {void}
	 */
	init: function () {
		if (this.ready) {
			return
		}
		this.getBids()
		this.getLearned()
		if (!TWDB.Updater.wasUpdated()) {
			const cachedData = TWDB.Cache.load("calcdata")
			if (typeof cachedData === "object" && cachedData !== null && isDefined(cachedData.loaded)) {
				this.calcdata = cachedData
			}
		}
	},
}


		;(function ($) {
			const _base = TWDB
			const w = window
			const Images = _base.images
			const Script = _base.script
			const ClothCalc = _base.ClothCalc

			/**
			 * Wait until `TWDB.images[imageKey]` exists, then invoke the callback.
			 * Uses the TWDBImagesLoaded event when available; falls back to polling/timeout.
			 *
			 * @param {string} imageKey
			 * @param {Function} callback
			 * @returns {void}
			 */
			function waitForImages(imageKey, callback) {
				if (Images[imageKey]) {
					callback()
					return
				}
				if (TWDB.Eventer) {
					const handlerId = TWDB.Eventer.set(
						"TWDBImagesLoaded",
						function () {
							if (Images[imageKey]) {
								TWDB.Eventer.remove("TWDBImagesLoaded", handlerId)
								callback()
							}
						},
						1
					) // Count = 1 means it will auto-remove after one trigger
					const checkInterval = setInterval(function () {
						if (Images[imageKey]) {
							clearInterval(checkInterval)
							TWDB.Eventer.remove("TWDBImagesLoaded", handlerId)
							callback()
						}
					}, 100)
					setTimeout(function () {
						clearInterval(checkInterval)
					}, 10000)
				} else {
					setTimeout(function () {
						if (Images[imageKey]) {
							callback()
						}
					}, 500)
				}
			}


const Debugger = (function (_$) {
	const debuggerObject = {}
	return debuggerObject
})($)
_base.Debugger = Debugger


const ErrorModule = (function ($) {
	const errorObj = {}
	const errorWindowId = "twdb_error"
	const errorList = []
	let notificationShown = true
	errorObj.report = function (error, message) {
		if (!isDefined(error.message)) {
			errorList.push({ msg: Language._("errors.failed_add_error"), e: message })
		} else {
			errorList.push({
				msg: `${message} ${(error.stack && (error.stack.match(/:\d+:\d+/) || [])[0]) || ""}`,
				e: error.message,
			})
		}
		if (notificationShown) {
			notificationShown = false
			WestUi.NotiBar.add(
				new OnGoingPermanentEntry(
					function () {
						showErrorLog()
					},
					Language._("errors.occurred"),
					"hint"
				)
			)
		}
	}
	const showErrorLog = function () {
		const scrollPane = new west.gui.Scrollpane()
		$(scrollPane.getMainDiv()).css("height", "375px")
		$(scrollPane.getMainDiv()).find(".tw2gui_scrollpane_clipper_contentpane").addClass("selectable")
		const style = `<style>#twdb_error_table { width: 99.5%; border-collapse: collapse; font-size: 12px; table-layout: fixed; } #twdb_error_table th { background:url('${Game.cdnURL}/images/interface/wood_texture_dark.jpg'); color: #fff; padding: 8px; text-align: left; border: 1px solid #666; } #twdb_error_table td { padding: 6px 8px; border: 1px solid #666; word-wrap: break-word; word-break: break-word; position: relative; } #twdb_error_table .col-index { width: 30px; min-width: 30px; text-align: center; } #twdb_error_table .col-msg { width: 40%; } #twdb_error_table .col-error { width: auto; } #twdb_error_table .copy-btn { display: none; position: absolute; right: 4px; top: 4px; background: #442200; color: #fff; border: 1px solid #666; padding: 2px 6px; font-size: 10px; cursor: pointer; border-radius: 3px; z-index: 5; } #twdb_error_table .copy-btn:hover { background: #5e321a; } #twdb_error_table td.col-msg:hover .copy-btn, #twdb_error_table td.col-error:hover .copy-btn { display: inline-block; }</style>`
		let htmlContent = `${style}<table id="twdb_error_table"><thead><tr><th class="col-index">#</th><th class="col-msg">${Language._("script.error_message")}</th><th class="col-error">${Language._("script.error_type")}</th></tr></thead><tbody>`
		for (let index = errorList.length - 1; index >= 0; index--) {
			const msg = String(errorList[index].msg || "")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
			const err = String(errorList[index].e || "")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
			const msgRaw = String(errorList[index].msg || "")
				.replace(/&/g, "&amp;")
				.replace(/"/g, "&quot;")
				.replace(/\n/g, "&#10;")
				.replace(/\r/g, "&#13;")
			const errRaw = String(errorList[index].e || "")
				.replace(/&/g, "&amp;")
				.replace(/"/g, "&quot;")
				.replace(/\n/g, "&#10;")
				.replace(/\r/g, "&#13;")
			const copyBtnText = Language._("script.error_copy")
			htmlContent += `<tr><td class="col-index">${index}</td><td class="col-msg">${msg}<button class="copy-btn" data-copy="${msgRaw}">${copyBtnText}</button></td><td class="col-error">${err}<button class="copy-btn" data-copy="${errRaw}">${copyBtnText}</button></td></tr>`
		}
		htmlContent += "</tbody></table>"
		scrollPane.appendContent(htmlContent)
		// Add copy functionality
		$(scrollPane.getMainDiv())
			.find(".copy-btn")
			.on("click", function () {
				let text = $(this).attr("data-copy")
				// Decode HTML entities
				const decodeDiv = document.createElement("div")
				decodeDiv.innerHTML = text
				text = decodeDiv.textContent || decodeDiv.innerText || text
				const copiedText = Language._("script.error_copied")
				if (navigator.clipboard?.writeText) {
					navigator.clipboard.writeText(text).then(
						function () {
							const btn = $(this)
							const original = btn.text()
							btn.text(copiedText)
							setTimeout(function () {
								btn.text(original)
							}, 1000)
						}.bind(this)
					)
				} else {
					// Fallback for older browsers
					const textarea = document.createElement("textarea")
					textarea.value = text
					textarea.style.position = "fixed"
					textarea.style.opacity = "0"
					document.body.appendChild(textarea)
					textarea.select()
					try {
						document.execCommand("copy")
						const btn = $(this)
						const original = btn.text()
						btn.text(copiedText)
						setTimeout(function () {
							btn.text(original)
						}, 1000)
					} catch (error) {
						ErrorModule.report(error, Language._("errors.copy_failed"))
					}
					document.body.removeChild(textarea)
				}
			})
		wman
			.open(errorWindowId, null, "noreload")
			.setMiniTitle(Language._("errors.mini_title"))
			.setTitle(Language._("errors.title"))
			.appendToContentPane(scrollPane.getMainDiv())
	}
	errorObj.test = function () {
		// Test errors with stack traces
		errorObj.report(new Error("Test error with stack trace"), "Test error message 1")
		errorObj.report(
			new Error("Language file loading error"),
			Language._("errors.language_file_loading")
		)
		errorObj.report(
			new Error("Failed to load module"),
			Language._("errors.failed_load_module", {
				module: "test-module",
			}) || "failed 000000 test-module"
		)
		errorObj.report(
			new Error("Cache error"),
			Language._("errors.load_from_cache", {
				key: "test-cache",
			}) || "failed 000000 test-cache"
		)

		errorObj.report(new Error("Worker error"), Language._("errors.worker"))

		// Test errors with descriptive messages (matching real usage patterns)
		errorObj.report(new Error("getFortData error"), "getFortData")
		errorObj.report(new Error("Job analyzer error"), "Job-Analyzer parseAndStoreJobReport")
		errorObj.report(new Error("Table sorting error"), "Analyzer applyTableSorting")
		errorObj.report(new Error("Bonus job error"), "bonusjob reset")
		errorObj.report(new Error("Color injection error"), "injectColor")

		// Test manipulation errors
		errorObj.report(new Error("NotiBar manipulation error"), "manipulate WestUi.NotiBar.add")
		errorObj.report(new Error("Work queue error"), "manipulate removeWorkQueuePA")
		errorObj.report(new Error("Nuggets error"), "manipulate changeWofNuggets")
		errorObj.report(new Error("Market dialog error"), "manipulate market sell dialog")

		// Test errors without stack traces (plain objects)
		errorObj.report({ message: "Error without stack trace" }, "Test error without stack")
		errorObj.report({ message: "Another plain error" }, "")

		// Test error with empty message
		var emptyErr = new Error("")
		errorObj.report(emptyErr, "Error with empty message")

		console.log("ErrorModule.test() completed - triggered multiple test errors")
	}
	return errorObj
})($)
_base.Error = ErrorModule
Debugger.Error = ErrorModule


/**
 * Module loader: polls for game readiness, then runs registered modules once deps are satisfied.
 * @namespace
 */
const Loader = (function (e) {
	let loaderApi = {}
	const moduleQueue = []
	const loadedModules = {}
	const failedModules = {}
	let intervalId
	let currentModule = false
	let isProcessing = false
	let hasDeadlock = false
	let maxRetryCount = 0
	/**
	 * Register a module in the loader.
	 * @param {string} e Key
	 * @param {string} t Display name
	 * @param {Function} r Init callback
	 * @param {Object<string,boolean>} [i] Dependency flags
	 * @returns {{ready:boolean}}
	 */
	loaderApi.add = function (moduleKey, displayName, initCallback, dependencies) {
		const readyState = { ready: false }
		moduleQueue.push({
			key: moduleKey,
			txt: displayName,
			call: initCallback,
			dep: dependencies || {},
			ready: readyState,
			count: 0,
		})
		return readyState
	}
	/**
	 * Start polling the loader loop.
	 * @returns {void}
	 */
	loaderApi.init = function () {
		if (intervalId) {
			return
		}
		intervalId = w.setInterval(function () {
			processLoaderQueue()
		}, 500)
	}
	const processLoaderQueue = function () {
		if (isProcessing) {
			return
		}
		isProcessing = true
		try {
			if (currentModule === false) {
				if (!checkGameReadiness()) {
					isProcessing = false
					return
				}
				TWDB.Cache.init()
				loadedModules.Cache = true
				try {
					Updater.query()
					registerScriptWithApi()
				} catch (error) {
					ErrorModule.report(error, Language._("errors.loader_api_registration"))
					new UserMessage(
						Language._("script.api_registration_failed"),
						UserMessage.TYPE_FATAL
					).show()
					return cleanupLoader()
				}
				return processNextModule()
			}
			if (isDefined(failedModules[currentModule.key])) {
				return processNextModule()
			}
			if (currentModule.ready.ready) {
				loadedModules[currentModule.key] = true
				hasDeadlock = false
				return processNextModule()
			}
			isProcessing = false
		} catch (error) {
			ErrorModule.report(error, Language._("errors.loader_process_queue"))
			isProcessing = false
		}
	}
	const checkGameReadiness = function () {
		try {
			if (
				!isDefined(w.jQuery) ||
				!isDefined(w.TheWestApi) ||
				!isDefined(w.TheWestApi.version) ||
				w.ItemManager.get(2e3) === undefined ||
				!isDefined(w.Character) ||
				w.Character.playerId === 0 ||
				!w.Bag.loaded
			) {
				return false
			} else {
				return true
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.loader_check_game_readiness"))
			return false
		}
	}
	const registerScriptWithApi = () => {
		try {
			const scriptInfo = {
				id: "twdb_clothcalc",
				name: "TW-DB.info - Cloth Calc - BB",
				version: "2.04",
				gameVersion: String(Script.game_version),
				author: "[tw-db.info] Team & BB",
				website: "https://tw-db.info",
			}
			const paypalForm = `<br><br><form action="https://www.paypal.com/cgi-bin/webscr" method="post"><input name="cmd" value="_s-xclick" type="hidden"><input name="encrypted" value="-----BEGIN PKCS7-----MIIHNwYJKoZIhvcNAQcEoIIHKDCCByQCAQExggEwMIIBLAIBADCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwDQYJKoZIhvcNAQEBBQAEgYChINvT18jAz9CalhBmJdmLCwpXoNRJP+VkXk8FX8ggf0svoPqtoBds+0Jtzdvj9jQ0Sf6erVBUCcRpMpkb+Tf3GCQVHTglnw8JrK6ZzzRhjsZZCJn7tgFwu2LimWCyFnNbeGNb3JeAUyoPqqNlc8tD5abn15g/a8T7+lmSJMLZOjELMAkGBSsOAwIaBQAwgbQGCSqGSIb3DQEHATAUBggqhkiG9w0DBwQIKDoxC57piTyAgZCs1uffooeE6z5oFOY8gF33GntGddTvCLpVnR2oEfR3HaNWR2/DSZsxTSBxOQ9h43E+9A9WN1QJDj+4qyu/20IbTBVkFCl/eoGTV44O///OowbrCRqIUbDKtBBj6rrv876AFW0aV8/iRoreP66eCBd3FG7K6Pue0rBR7khec7TFMM0kd++ZT0QTSvuQ4IvsbOWgggOHMIIDgzCCAuygAwIBAgIBADANBgkqhkiG9w0BAQUFADCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBglghkiG9w0BCQEWDXJlQHBheXBhbC5jb20wHhcNMDQwMjEzMTAxMzE1WhcNMzUwMjEzMTAxMzE1WjCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20wgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMFHTt38RMxLXJyO2SmS+Ndl72T7oKJ4u4uw+6awntALWh03PewmIJuzbALScsTS4sZoS1fKciBGoh11gIfHzylvkdNe/hJl66/RGqrj5rFb08sAABNTzDTiqqNpJeBsYs/c2aiGozptX2RlnBktH+SUNpAajW724Nv2Wvhif6sFAgMBAAGjge4wgeswHQYDVR0OBBYEFJaffLvGbxe9WT9S1wob7BDWZJRrMIG7BgNVHSMEgbMwgbCAFJaffLvGbxe9WT9S1wob7BDWZJRroYGUpIGRMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbYIBADAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBBQUAA4GBAIFfOlaagFrl71+jq6OKidbWFSE+Q4FqROvdgIONth+8kSK//Y/4ihuE4Ymvzn5ceE3S/iBSQQMjyvb+s2TWbQYDwcp129OPIbD9epdr4tJOUNiSojw7BHwYRiPh58S1xGlFgHFXwrEBb3dgNbMUa+u4qectsMAXpVHnD9wIyfmHMYIBmjCCAZYCAQEwgZQwgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tAgEAMAkGBSsOAwIaBQCgXTAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0xMTAxMTkyMDQ1NDVaMCMGCSqGSIb3DQEJBDEWBBSftIcjkFDuoOkdAfklhyX0/yFgtzANBgkqhkiG9w0BAQEFAASBgF9SGe3NSMpJbcwAlWM9fDzOYOQovnXP1jCT9eR7ZCsZ4UdlS5u5/ubq4KvSd2s/Iz7H8I69CL5vY6n50Qk57lZv2m+DSmY/p+xjcPG0JBuRaT0uGNOeiPdXwC+HiDPP6EhJXXEZv5fqXPmOUJPdovWYgyu/LgVCRAZw1qp3995m-----END PKCS7-----" type="hidden"><input type="image" src="https://www.paypalobjects.com/en_US/DE/i/btn/btn_donateCC_LG.gif" border="0" name="submit" alt="${Language._("script.paypal_alt")}"><img width="1" border="0" height="1" src="https://www.paypal.com/en_GB/i/scr/pixel.gif" alt=""></form><br>`
			const registeredScript = w.TheWestApi.register(
				scriptInfo.id,
				scriptInfo.name,
				scriptInfo.version,
				scriptInfo.gameVersion,
				scriptInfo.author,
				scriptInfo.website
			)
			const guiContent = e(
				`<div style="font-family: 'comic sans ms'; font-size: 13pt; padding-top: 10px; text-align: center;">${Language._("script.description")}${paypalForm}${Language._("script.thank_you")}</div>`
			)
			registeredScript.setGui(guiContent)
			if (registeredScript.isOutdated()) {
				w.TheWestApi.displayOutdated()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.loader_register_script_api"))
		}
	}
	const processNextModule = function () {
		if (moduleQueue.length === 0) {
			return cleanupLoader()
		}
		try {
			currentModule = moduleQueue.shift()
			currentModule.count++
			if (currentModule.count > maxRetryCount) {
				if (hasDeadlock) {
					ErrorModule.report(
						{ message: Language._("errors.deadlock_detected") },
						Language._("errors.failed_load_module", { module: currentModule.key })
					)
					failedModules[currentModule.key] = true
					return processNextModule()
				}
				maxRetryCount++
				hasDeadlock = true
			}
			for (const dependencyKey in currentModule.dep) {
				if (!isDefined(loadedModules[dependencyKey])) {
					if (TWDB.script.isDev()) {
						console.log(currentModule.key, Language._("debug.needs"), dependencyKey)
					}
					moduleQueue.push(currentModule)
					return processNextModule()
				}
			}
			try {
				currentModule.call()
			} catch (moduleError) {
				ErrorModule.report(
					moduleError,
					Language._("errors.failed_load_module", { module: currentModule.key })
				)
				failedModules[currentModule.key] = true
				return processNextModule()
			}
			isProcessing = false
			processLoaderQueue()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.loader_process_next_module"))
			isProcessing = false
		}
	}
	const cleanupLoader = function () {
		try {
			w.clearInterval(intervalId)
			w.setTimeout(function () {
				loaderApi = null
			}, 1e3)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.loader_cleanup"))
		}
	}
	loaderApi.stack = moduleQueue
	loaderApi.loaded = loadedModules
	loaderApi.failed = failedModules
	loaderApi.current = currentModule
	return loaderApi
})($)
Debugger.Loader = Loader


const Cache = (function ($) {
	const cache = {}
	const state = {}
	let keyPrefix = ""
	let keyRegistry = {}
	const registerKey = function (key) {
		if (!keyRegistry[key]) {
			keyRegistry[key] = true
			cache.save("keys", keyRegistry)
		}
	}
	const initialize = function () {
		if (state.ready) {
			return
		}
		keyPrefix = `twdb_${Character.playerId}_`
		keyRegistry = cache.load("keys")
		if (!keyRegistry) {
			keyRegistry = { keys: true }
		}
		state.ready = true
	}
	cache.load = function (key) {
		registerKey(key)
		try {
			return JSON.parse(decodeURIComponent(localStorage.getItem(keyPrefix + key)))
		} catch (error) {
			ErrorModule.report(error, Language._("errors.load_from_cache", { key }))
			cache.save(key, null)
			return null
		}
	}
	cache.save = function (key, value) {
		registerKey(key)
		try {
			localStorage.setItem(keyPrefix + key, encodeURIComponent(JSON.stringify(value)))
			return true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.save_to_cache", { key }))
			cache.save(key, null)
			return false
		}
	}
	cache.reset = function (confirmed, specificKey) {
		try {
			if (confirmed) {
				if (isDefined(specificKey)) {
					localStorage.removeItem(specificKey)
				} else {
					for (const key in keyRegistry) {
						localStorage.removeItem(keyPrefix + key)
					}
				}
				new UserMessage(Language._("cache.reset_complete"), UserMessage.TYPE_SUCCESS).show()
				location.href = location.href.replace(location.hash || "#", "")
			} else {
				const dialogContent = $(
					`<div><h2>${Language._("cache.reset_confirm", { script: Script.name })}</h2></div>`
				)
				const keyInput = new west.gui.Textfield("twdb_cache_key")
					.setSize(40)
					.setLabel(`${Language._("cache.reset_key")}:`)
				dialogContent.append(keyInput.getMainDiv())
				const resetAllCheckbox = new west.gui.Checkbox(
					Language._("cache.reset_all_keys")
				).setSelected(true)
				resetAllCheckbox.setCallback(function (checked) {
					if (checked) {
						keyInput.setValue("")
					}
				})
				$(keyInput.getMainDiv()).find("span").css("font-size", "12px")
				$(keyInput.getMainDiv())
					.find("input")
					.keyup(function () {
						resetAllCheckbox.setSelected(false)
					})
				dialogContent.append(
					$('<div style="display:block;" />').append(resetAllCheckbox.getMainDiv())
				)
				new west.gui.Dialog(Language._("cache.reset"), dialogContent, west.gui.Dialog.SYS_QUESTION)
					.addButton(Language._("common.ok"), function () {
						if (resetAllCheckbox.isSelected()) {
							cache.reset(true)
						} else {
							cache.reset(true, keyInput.getValue())
						}
					})
					.addButton(Language._("common.cancel"))
					.show()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.cache_reset"))
		}
	}
	cache.init = initialize
	return cache
})($)
_base.Cache = Cache
Debugger.Cache = Cache


const Worker = (function (_e) {
	const workerApi = {}
	const taskQueue = []
	let intervalId = false
	let isProcessing = false
	workerApi.add = function (task) {
		taskQueue.push(task)
		if (intervalId) {
			return
		}
		intervalId = w.setInterval(function () {
			processWorkerTask()
		}, 100)
	}
	const processWorkerTask = function () {
		if (isProcessing) {
			return
		}
		try {
			isProcessing = true
			const task = taskQueue.shift()
			if (task) {
				try {
					task()
				} catch (taskError) {
					ErrorModule.report(taskError, Language._("errors.worker"))
				}
			}
			if (taskQueue.length === 0) {
				w.clearInterval(intervalId)
				intervalId = false
			}
			isProcessing = false
		} catch (error) {
			ErrorModule.report(error, Language._("errors.worker_process_task"))
			isProcessing = false
		}
	}
	return workerApi
})($)
Debugger.Worker = Worker


const Timer = (function (_context) {
	const api = {}
	let lastTime = 0
	let shortTermCount = 0
	let longTermCount = 0
	api.getTimeout = function () {
		const currentTime = Date.now()
		if (currentTime - lastTime < 2e3) {
			shortTermCount++
		} else {
			shortTermCount = 0
		}
		if (currentTime - lastTime < 6e4) {
			longTermCount++
		} else {
			longTermCount = 0
		}
		lastTime = currentTime
		let baseTimeout = 0
		if (longTermCount > 50) {
			baseTimeout = 6e4
		}
		if (shortTermCount < 20) {
			return baseTimeout + 200
		}
		return baseTimeout + 2e3
	}
	return api
})($)
Debugger.Timer = Timer


const Eventer = (function (_context) {
	const api = {}
	const events = {}
	api.set = function (eventName, callback, repeatCount) {
		if (!isDefined(events[eventName])) {
			events[eventName] = {}
		}
		const count = isDefined(repeatCount) ? repeatCount : false
		let handlerId = Number(Date.now())
		while (events[eventName][handlerId]) handlerId++
		events[eventName][handlerId] = { id: handlerId, call: callback, count: count }
		return handlerId
	}
	api.trigger = function (eventName) {
		if (!isDefined(events[eventName])) {
			return
		}
		let remainingCount = 0
		for (const handlerId in events[eventName]) {
			if (!isDefined(events[eventName][handlerId].id)) {
				continue
			}
			w.setTimeout(events[eventName][handlerId].call, 10)
			if (events[eventName][handlerId].count === false) {
				remainingCount++
				continue
			}
			events[eventName][handlerId].count--
			if (events[eventName][handlerId].count > 0) {
				remainingCount++
			}
		}
		if (remainingCount === 0) {
			delete events[eventName]
		}
	}
	api.remove = function (eventName, handlerId) {
		if (!isDefined(events[eventName]) || !isDefined(events[eventName][handlerId])) {
			return false
		}
		delete events[eventName][handlerId]
	}
	return api
})($)
_base.Eventer = Eventer
Debugger.Eventer = Eventer


const Jobs = (function (e) {
	const jobsApi = {}
	let readyState = {}
	const jobIdList = []
	const jobNameMap = {}
	const jobShortnameMap = {}
	const productItemIds = [1828e3, 1829e3, 183e4, 2e6, 2003e3, 2006e3, 2009e3]
	let constructionJob
	let jobDataCache = {}
	const initializeJobSystem = function () {
		if (readyState.ready) {
			return
		}
		try {
			let jobId = 0
			let consecutiveFailures = 0
			const processedYields = {}
			while (true) {
				jobId++
				const job = w.JobList.getJobById(jobId)
				if (!job) {
					consecutiveFailures++
					if (consecutiveFailures > 5) {
						break
					}
					continue
				}
				consecutiveFailures = 0
				jobIdList.push(job.id)
				jobNameMap[job.name.toLowerCase()] = job.id
				jobShortnameMap[job.shortname.toLowerCase()] = job.id
				for (const yieldKey in job.yields) {
					if (Number.isNaN(yieldKey) || processedYields[yieldKey]) {
						continue
					}
					processedYields[yieldKey] = true
					productItemIds.push(Number(yieldKey))
				}
			}
			constructionJob = (function (_e) {
				const constructionJobData = {
					description: "",
					duration: 1800,
					energy: 6,
					groupid: null,
					id: 255,
					malus: 0,
					name: Language._("misc.construction"),
					randomyields: [],
					shortname: "construction",
					skills: { build: 3, repair: 1, leadership: 1 },
					yields: {},
					calcJobPoints: function () {
						return 0
					},
					canDo: function () {
						return true
					},
				}
				return constructionJobData
			})(e)
			jobIdList.push(255)
			jobNameMap[constructionJob.name.toLowerCase()] = 255
			jobShortnameMap[constructionJob.shortname.toLowerCase()] = 255
			const compareJobNames = function (jobId1, jobId2) {
				const job1 = jobId1 === 255 ? constructionJob : w.JobList.getJobById(jobId1)
				const job2 = jobId2 === 255 ? constructionJob : w.JobList.getJobById(jobId2)
				return job1.name > job2.name
			}
			jobIdList.sort(compareJobNames)
			productItemIds.sort()
			jobDataCache = Cache.load("jobdata")
			if (jobDataCache === null || typeof jobDataCache !== "object") {
				jobDataCache = {}
			}
			Eventer.set("TWDBdataLoaded", function () {
				resetJobData()
			})
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.jobs_initialize_system"))
		}
	}
	readyState = Loader.add("Jobs", "tw-db Jobsystem", initializeJobSystem, { Cache: true })
	const resetJobData = function () {
		try {
			jobDataCache = {}
			Cache.save("jobdata", jobDataCache)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.jobs_reset_data"))
		}
	}
	jobsApi.getJobByName = function (jobName) {
		jobName = e.trim(jobName).toLowerCase()
		if (!isDefined(jobNameMap[jobName])) {
			return null
		}
		return jobsApi.getJobById(jobNameMap[jobName])
	}
	jobsApi.getJobByShortname = function (shortname) {
		shortname = e.trim(shortname).toLowerCase()
		if (!isDefined(jobShortnameMap[shortname])) {
			return null
		}
		return jobsApi.getJobById(jobShortnameMap[shortname])
	}
	jobsApi.getJobById = function (jobId) {
		let job
		if (jobId === 255) {
			job = constructionJob
		} else {
			job = w.JobList.getJobById(jobId)
			if (!job) {
				return job
			}
		}
		const jobCopy = e.extend(true, {}, job)
		let multiplier = 1
		if (w.Character.charClass === "adventurer") {
			if (w.Premium.hasBonus("character")) {
				multiplier *= 1.2
			} else {
				multiplier *= 1.1
			}
		}
		if (w.Premium.hasBonus("money")) {
			multiplier *= 1.5
		}
		for (let index = 0; index < jobCopy.randomyields.length; index++) {
			jobCopy.randomyields[index] = round(jobCopy.randomyields[index] * multiplier, 2)
		}
		if (typeof jobCopy.yields.length === "undefined") {
			for (const yieldKey in jobCopy.yields) {
				jobCopy.yields[yieldKey].prop = round(jobCopy.yields[yieldKey].prop * multiplier, 2)
			}
		}
		return jobCopy
	}
	jobsApi.openJob = function (jobId, x, y) {
		w.JobWindow.open(jobId, x, y)
	}
	jobsApi.startJob = function (jobId, x, y, duration) {
		w.JobWindow.startJob(jobId, x, y, Number(duration) || 3600)
	}
	jobsApi.getAllJobs = function () {
		return jobIdList
	}
	jobsApi.isProduct = function (itemId) {
		return e.inArray(Number(itemId), productItemIds)
	}
	jobsApi.getPopup = function (jobId, bonusType) {
		let popupHtml = '<div style="min-width:60px;text-align:center" >'
		const job = jobsApi.getJobById(jobId)
		if (isDefined(job)) {
			popupHtml += `<span style="font-weight:bold;display:block;">${job.name}</span><div class="job" style="position:relative;left:50%;margin:10px -25px;"><div ${!isDefined(bonusType) ? "" : `class="featured ${bonusType}"`}></div><img src="${Game.cdnURL}/images/jobs/${job.shortname}.png" class="job_icon" ></div>`
		}
		popupHtml += "</div>"
		return popupHtml
	}
	return jobsApi
})($)
_base.Jobs = Jobs
Debugger.Jobs = Jobs


const Window = (function (e) {
	const windowApi = {}
	const windowConfig = "twdb_window"
	let windowElement = null
	let currentTabContent = null
	const tabRegistry = {}
	let readyState = {}
	const initializeWindowModule = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (!Images.button) {
				waitForImages("button", initializeWindowModule)
				return
			}
			const menuButton = e(`<div title="TW-DB.info | BB" class="menulink" />`)
				.css("background-image", `url(${Images.button})`)
				.on("mouseenter", function () {
					e(this).css("background-position", "-25px 0px")
				})
				.on("mouseleave", function () {
					e(this).css("background-position", "0px 0px")
				})
				.click(function () {
					openScriptWindow()
				})
			e("#ui_menubar").append(
				e('<div class="ui_menucontainer" id="TWDB_ClothCalc_menubuttons" />')
					.append(menuButton)
					.append('<div class="menucontainer_bottom" />')
			)
			ready = true
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.window_initialize"))
		}
	}
	readyState = Loader.add("Window", "tw-db Scriptwindow", initializeWindowModule)
	windowApi.open = function (tabId) {
		openScriptWindow(tabId)
	}
	const openScriptWindow = function (tabId) {
		try {
			windowElement = wman
				.open(windowConfig, null)
				.setMiniTitle(Language._("script.twdb_title"))
				.setTitle(Language._("script.twdb_title"))
			windowElement.appendToContentPane(
				e(
					`<div style="width:100%;text-align:center;position:absolute;bottom:0px;left:0px;height:15px;display:block;font-size:12px;color:#000000;">.:powered by TW-DB Team & BB | <a href="https://tw-db.info" style="font-weight:normal;color:#000000;" target="_blank">${Language._("script.twdb_title")}:.</a> | .:v${Script.version}:.</div>`
				)
			)
			let defaultTab
			for (const tabKey in tabRegistry) {
				if (!isDefined(defaultTab)) {
					defaultTab = tabKey
				}
				if (tabId === tabKey) {
					defaultTab = tabKey
				}
				windowElement.addTab(tabRegistry[tabKey].name, tabKey, function (_e, tabKey) {
					switchToTab(tabKey)
				})
				tabRegistry[tabKey].gui.children().remove()
				windowElement.appendToContentPane(tabRegistry[tabKey].gui)
			}
			if (isDefined(defaultTab)) {
				currentTabContent = tabRegistry[defaultTab].gui
				switchToTab(defaultTab)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.window_open"))
		}
	}
	const switchToTab = function (tabId) {
		try {
			currentTabContent.hide()
			windowElement.showLoader()
			windowElement.activateTab(tabId)
			if (!isDefined(tabRegistry[tabId])) {
				return
			}
			if (tabRegistry[tabId].title !== "") {
				windowElement.setTitle(
					Language._("script.twdb_title_with", { title: tabRegistry[tabId].title })
				)
			} else {
				windowElement.setTitle("")
			}
			currentTabContent = tabRegistry[tabId].gui
			currentTabContent.show()
			w.setTimeout(tabRegistry[tabId].callback, 10)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.window_switch_tab"))
		}
	}
	windowApi.addTab = function (tabId, tabName, tabTitle, tabCallback) {
		tabRegistry[tabId] = { title: tabTitle, name: tabName, callback: tabCallback, gui: null }
		tabRegistry[tabId].gui = e('<div style="margin-top:10px;"/>').hide()
		return tabRegistry[tabId].gui
	}
	windowApi.updateTab = function (id, name, title) {
		if (!isDefined(tabRegistry[id])) {
			return
		}
		tabRegistry[id].name = name
		tabRegistry[id].title = title
		// If window is open and this tab is currently active, update the window title
		if (windowElement !== null && currentTabContent === tabRegistry[id].gui) {
			if (title !== "") {
				windowElement.setTitle(Language._("script.twdb_title_with", { title }))
			} else {
				windowElement.setTitle("")
			}
		}
	}
	windowApi.hideLoader = function () {
		if (windowElement) {
			windowElement.hideLoader()
		}
	}
	windowApi.showLoader = function () {
		if (windowElement) {
			windowElement.showLoader()
		}
	}
	return windowApi
})($)
Debugger.Window = Window


const Settings = (function ($) {
	let settings = {}
	const cache = {}
	let settingsWindowTab = null
	let loaderModule = {}
	const initialize = function () {
		if (loaderModule.ready) {
			return
		}
		const loadedSettings = Cache.load("settings")
		if (typeof loadedSettings === "object" && loadedSettings !== null) {
			settings = loadedSettings
		} else {
			settings = {}
		}
		// Styles for script widgets + settings UI.
		TWDB.Util.addCss(
			`span.twdb_sett_capt{font-size:115%;font-weight:bold;font-style:italic;display:inline-block;margin-top:8px;text-shadow:2px 1px 2px #643}.build_progress>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:264px}.rp_row_jobdata>.rp_jobdata_text>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:125px}#character-shadow>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:95px}#char_crafting_progress>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:144px}.dal_status>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:294px}.job_progress_jobstars>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:219px}.cell.cell_2.progress>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill,.saloon_duel_moti>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:194px}.flfi_progressbar>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:324px}.dl_motivation>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:330px}.duels-TWXDuelMap>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:766px}.sheriff-TWXSheriff>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:581px}.messages-analyzer-job>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:692px}.achievement-categories-total>.entry>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:204px}.achievement-total-completed>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:623px}#achievement_progress>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:450px}.achievement-list>.achievement-list-scroll-wrapper>.tw2gui_scrollpane>.tw2gui_scrollpane_clipper>.tw2gui_scrollpane_clipper_contentpane>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:490px}[class^="TWFBT_"]>.tw2gui_window_content_pane>.tw2gui_scrollpane>.tw2gui_scrollpane_clipper>.tw2gui_scrollpane_clipper_contentpane>.tw2gui_progressbar>.tw2gui_progressbar_progress>.tw2gui_progressbar_fill{max-width:677px}.TWDS_fbs_basestats_content table thead tr{position:sticky;top:0;background:wheat}div.job_bestwearbutton{top:5px!important}.fort_battle_button_analyzer{left:304px!important}.fort_battle_buttons{left:98px!important}.settings-container{display:flex;flex-direction:column;gap:1px;padding-bottom:12px}.settings-item{display:flex;align-items:center;gap:4px}.settings-category-header{font-size:115%;font-weight:bold;font-style:italic;display:block;margin-top:8px;text-shadow:2px 1px 2px #643}.settings-item-checkbox{flex-shrink:0;width:25px}.settings-item-label{flex-grow:1;cursor:pointer}.settings-group-header{display:flex;align-items:center;cursor:pointer;margin-top:8px;padding:4px 0;border-radius:3px}.settings-group-header .icon{width:16px;height:16px;background-repeat:no-repeat;margin-left:5px;margin-right:5px}.settings-group-header .butMinus{background-image:url(${Game.cdnURL}/images/scrollbar/scroll_down.png)}.settings-group-header .butPlus{background-image:url(${Game.cdnURL}/images/scrollbar/scroll_up.png)}.settings-group-content{padding-left:30px;display:none;flex-direction:column;gap:3px}.beeper-sound-settings{display:flex;align-items:center;gap:10px;padding:4px 0}.active_tab_id_settings>*,.active_tab_id_notes>*{user-select:none}.twdb_lang_combobox .tw2gui_combobox_list{max-height:260px;overflow-y:auto;overflow-x:hidden}.tw2gui_combobox_list .tw2gui_scrollpane_clipper_contentpane>span{display:block;cursor:pointer;padding-left:6px}.tw2gui_combobox_list .tw2gui_scrollpane_clipper_contentpane>span:hover{background:url("${Game.cdnURL}/images/tw2gui/arrow/arrow_right.png") left center no-repeat}.tw2gui_groupframe.has-scrollbar{margin-left:-6px;}`
		)
		settingsWindowTab = Window.addTab(
			"settings",
			Language._("settings.title"),
			Language._("settings.title"),
			renderSettingsTab
		)
		loaderModule.ready = true
	}
	loaderModule = Loader.add("Settings", "tw-db Settingssystem", initialize, {
		Cache: true,
		Window: true,
	})
	// Language definitions - moved to module scope for export
	const langs = [
		{
			locale: "en_DK",
			twoLettersCode: "en",
			svgFlagCodes: ["us", "gb"],
			name: "English",
			lang_name: "International",
			translator: "Belle Bernice",
		},
		{
			locale: "el_GR",
			twoLettersCode: "el",
			svgFlagCode: "gr",
			name: "Greek",
			lang_name: "Ελληνικά",
			translator: "Belle Bernice",
		},
		{
			locale: "cs_CZ",
			twoLettersCode: "cs",
			svgFlagCode: "cz",
			name: "Czech",
			lang_name: "Čeština",
			translator: "Auto Translate",
		},
		{
			locale: "de_DE",
			twoLettersCode: "de",
			svgFlagCode: "de",
			name: "German",
			lang_name: "Deutsch",
			translator: "Auto Translate",
		},
		{
			locale: "es_ES",
			twoLettersCode: "es",
			svgFlagCode: "es",
			name: "Spanish",
			lang_name: "Español",
			translator: "Auto Translate",
		},
		{
			locale: "pt_BR",
			twoLettersCode: "pt-BR",
			svgFlagCode: "br",
			name: "Portuguese",
			lang_name: "Português",
			translator: "Auto Translate",
		},
		{
			locale: "fr_FR",
			twoLettersCode: "fr",
			svgFlagCode: "fr",
			name: "French",
			lang_name: "Français",
			translator: "Auto Translate",
		},
		{
			locale: "hu_HU",
			twoLettersCode: "hu",
			svgFlagCode: "hu",
			name: "Hungarian",
			lang_name: "Magyar",
			translator: "Auto Translate",
		},
		{
			locale: "it_IT",
			twoLettersCode: "it",
			svgFlagCode: "it",
			name: "Italian",
			lang_name: "Italiano",
			translator: "Auto Translate",
		},
		{
			locale: "nl_NL",
			twoLettersCode: "nl",
			svgFlagCode: "nl",
			name: "Dutch",
			lang_name: "Dutch",
			translator: "Auto Translate",
		},
		{
			locale: "pt_PT",
			twoLettersCode: "pt-PT",
			svgFlagCode: "pt",
			name: "Portuguese",
			lang_name: "Português",
			translator: "Auto Translate",
		},
		{
			locale: "pl_PL",
			twoLettersCode: "pl",
			svgFlagCode: "pl",
			name: "Polish",
			lang_name: "Polski",
			translator: "Auto Translate",
		},
		{
			locale: "ro_RO",
			twoLettersCode: "ro",
			svgFlagCode: "ro",
			name: "Romanian",
			lang_name: "Română",
			translator: "Auto Translate",
		},
		{
			locale: "ru_RU",
			twoLettersCode: "ru",
			svgFlagCode: "ru",
			name: "Russian",
			lang_name: "Русский",
			translator: "Auto Translate",
		},
		{
			locale: "sk_SK",
			twoLettersCode: "sk",
			svgFlagCode: "sk",
			name: "Slovak",
			lang_name: "Slovenčina",
			translator: "Auto Translate",
		},
		{
			locale: "tr_TR",
			twoLettersCode: "tr",
			svgFlagCode: "tr",
			name: "Turkish",
			lang_name: "Türkçe",
			translator: "Auto Translate",
		},
		{
			locale: "da_DK",
			twoLettersCode: "da",
			svgFlagCode: "dk",
			name: "Danish",
			lang_name: "Dansk",
			translator: "Auto Translate",
		},
		{
			locale: "es_AR",
			twoLettersCode: "es-AR",
			svgFlagCode: "ar",
			name: "Spanish",
			lang_name: "Español",
			translator: "Auto Translate",
		},
		{
			locale: "es_MX",
			twoLettersCode: "es-MX",
			svgFlagCode: "mx",
			name: "Spanish",
			lang_name: "Español",
			translator: "Auto Translate",
		},
		{
			locale: "fi_FI",
			twoLettersCode: "fi",
			svgFlagCode: "fi",
			name: "Finnish",
			lang_name: "Suomi",
			translator: "Auto Translate",
		},
		{
			locale: "hr_HR",
			twoLettersCode: "hr",
			svgFlagCode: "hr",
			name: "Croatian",
			lang_name: "Hrvatski",
			translator: "Auto Translate",
		},
		{
			locale: "no_NO",
			twoLettersCode: "no",
			svgFlagCode: "no",
			name: "Norwegian",
			lang_name: "Norsk",
			translator: "Auto Translate",
		},
		{
			locale: "sl_SI",
			twoLettersCode: "sl",
			svgFlagCode: "si",
			name: "Slovenian",
			lang_name: "Slovenščina",
			translator: "Auto Translate",
		},
		{
			locale: "sr_RS",
			twoLettersCode: "sr",
			svgFlagCode: "rs",
			name: "Serbian",
			lang_name: "Српски",
			translator: "Auto Translate",
		},
		{
			locale: "sv_SE",
			twoLettersCode: "sv",
			svgFlagCode: "se",
			name: "Swedish",
			lang_name: "Svenska",
			translator: "Auto Translate",
		},
		{
			locale: "uk_UA",
			twoLettersCode: "uk",
			svgFlagCode: "ua",
			name: "Ukrainian",
			lang_name: "Українська",
			translator: "Auto Translate",
		},
	]
	// Renders the settings tab content
	const renderSettingsTab = function () {
		settingsWindowTab.children().remove()
		const scrollpane = new west.gui.Scrollpane()
		$(scrollpane.getMainDiv()).css("height", "294px").css("margin-bottom", "6px")
		settingsWindowTab.append(scrollpane.getMainDiv())
		// Define setting options using an array of objects
		const settingOptions = [
			{ type: "category", title: Language._("settings.category_inventory") },
			{
				id: "collector",
				text: Language._("settings.collector"),
			},
			{
				id: "collector_sell",
				text: Language._("settings.collector_sell"),
			},
			{
				id: "pin_items",
				text: Language._("settings.pin_items"),
			},
			{ type: "category", title: Language._("settings.category_quests") },
			{
				id: "quest_cancel",
				text: Language._("settings.quest_cancel"),
			},
			{
				id: "instant_quest",
				text: Language._("settings.instant_quest"),
			},
			{
				id: "colored_quest",
				text: Language._("settings.colored_quest"),
			},
			{ type: "category", title: Language._("settings.category_jobs") },
			{
				id: "job_show_lp",
				text: Language._("settings.job_lp"),
			},
			{ type: "category", title: Language._("settings.category_task_list") },
			{
				id: "task_list_points",
				text: Language._("settings.task_points"),
			},
			{ type: "category", title: Language._("settings.category_fort") },
			{
				id: "import_westforts",
				text: Language._("settings.forts_import"),
			},
			{
				id: "fort_recruitment",
				text: Language._("settings.fort_recruit"),
			},
			{
				id: "enhanced_fort_recruitment",
				text: Language._("settings.fort_recruit_enhanced"),
			},
			{
				id: "declare_report",
				text: Language._("settings.declare_report"),
			},
			{
				id: "owned_forts_tab",
				text: Language._("settings.forts_owned"),
			},
			{
				id: "cemetery_critical",
				text: Language._("settings.cemetery_critical"),
			},
			{
				id: "total_dmg_battle",
				text: Language._("settings.battle_damage"),
			},
			{
				id: "battle_info_round",
				text: Language._("settings.battle_round"),
			},
			{ type: "category", title: Language._("settings.category_town") },
			{
				id: "building_progress",
				text: Language._("settings.building_progress"),
			},
			{
				id: "church_levels",
				text: Language._("settings.church_levels"),
			},
			{
				id: "improved_cityhall_tab",
				text: Language._("settings.improved_cityhall_tab"),
			},
			{
				id: "town_forum_blink",
				text: Language._("settings.forum_blink"),
			},
			{ type: "category", title: Language._("settings.category_market") },
			{ id: "market_map", text: Language._("settings.market_map") },
			{
				id: "market_reminder",
				text: Language._("settings.market_reminder"),
			},
			{
				id: "market_sell_dialog",
				text: Language._("settings.market_sell"),
			},
			{
				id: "market_report",
				text: Language._("settings.market_report"),
			},
			{
				id: "improved_market",
				text: Language._("settings.market_improved"),
			},
			{ type: "category", title: Language._("settings.category_graphics") },
			{
				id: "duel_motivation",
				text: Language._("settings.duel_motivation"),
			},
			{
				id: "direct_sleep",
				text: Language._("settings.sleep_direct"),
			},
			{
				id: "deposit",
				text: Language._("settings.deposit"),
			},
			{
				id: "no_shop_sale",
				text: Language._("settings.shop_sale_off"),
			},
			{
				id: "exp_bar",
				text: Language._("settings.exp_bar"),
			},
			{
				id: "mini_chat",
				text: Language._("settings.mini_chat"),
			},
			{
				id: "event_counter",
				text: Language._("settings.event_counter"),
			},
			{
				id: "scrollbars_off",
				text: Language._("settings.scrollbars_off"),
			},
			{
				id: "wear_close",
				text: Language._("settings.wear_close"),
			},
			{
				id: "profile_duel_exp",
				text: Language._("settings.profile_duel_exp"),
			},
			{
				id: "regen_timers",
				text: Language._("settings.regen_timers"),
			},
			{
				id: "button_church",
				text: Language._("settings.button_church"),
				group: Language._("settings.automation_buttons"),
			},
			{
				id: "button_market",
				text: Language._("settings.button_market"),
				group: Language._("settings.automation_buttons"),
			},
			{ type: "category", title: Language._("settings.category_minimap") },
			{
				id: "bonus_jobs",
				text: Language._("settings.bonus_jobs"),
			},
			{
				id: "coordinates_input",
				text: Language._("settings.coordinates_input"),
			},
			{
				type: "category",
				title: Language._("settings.category_premium"),
			},
			{
				id: "work_queue_off",
				text: Language._("settings.work_queue_off"),
			},
			{
				id: "fetch_all_off",
				text: Language._("settings.fetch_all_off"),
			},
			{
				id: "wof_nuggets_off",
				text: Language._("settings.wof_nuggets_off"),
			},
			{ type: "category", title: Language._("settings.category_misc") },
			{
				id: "chat",
				text: Language._("settings.chat"),
			},
			{
				id: "notes",
				text: Language._("settings.notes"),
			},
			{
				id: "auto_deposit",
				text: Language._("settings.auto_deposit"),
			},
			{
				id: "chest_analyzer",
				text: Language._("settings.chest_analyzer"),
			},
			{
				id: "weekly_crafting",
				text: Language._("settings.weekly_crafting"),
			},
			{
				id: "telegram_bb_codes",
				text: Language._("settings.telegram_bb_codes"),
			},
			{
				id: "enhanced_rankings",
				text: Language._("settings.enhanced_rankings"),
			},
			{
				id: "translation_texts",
				text: Language._("settings.translation_texts"),
			},
			{
				id: "forum_select",
				text: Language._("settings.forum_select"),
			},
			{
				id: "pin_important",
				text: Language._("settings.pin_important"),
			},
			{
				id: "fortbattle_reminder",
				text: Language._("settings.fortbattle_reminder"),
			},
			{
				id: "night_mode",
				text: Language._("settings.night_mode"),
			},
			{
				id: "blink_events",
				text: Language._("settings.blink_events"),
			},
			{
				id: "whisper_improved",
				text: Language._("settings.whisper_improved"),
			},
		]
		const settingsContentContainer = $("<div class='settings-container' />")
		// Language selector container - first item, aligned to the right
		const langContainer = $(
			'<div style="display:flex;flex-direction:column;align-items:flex-end;margin:0 12px -24px 0;" />'
		)
		const langRow = $('<div style="display:flex;align-items:center;justify-content:flex-end;" />')
		const langLabel = $(
			`<div style="font-weight:bold;margin-right:4px;text-shadow:2px 1px 2px #fae3ad;color:#5e321a;">${Language._("script.lang")}:</div>`
		)
		const translatorText = $(
			`<div style="font-size:8.5pt;color:#575757;text-align:right;font-style:italic;"><span style="font-weight:bold;color:#5b5b5b;">${Language._("settings.translation_by", "Translation by")}:</span> <span class="twdb-translator-name"></span></div>`
		)
		const translatorNameSpan = translatorText.find(".twdb-translator-name")
		const langCombobox = new west.gui.Combobox().setWidth(167)
		// Make only the language dropdown scrollable, using native TW scrollpane if available.
		;(function makeScrollableCombobox(combo, maxHeight, width) {
			const originalOnDropdown = combo.onDropdown
			combo.onDropdown = function () {
				originalOnDropdown.call(this)
				try {
					const $contentPane = $(".tw2gui_modal_box")
						.last()
						.find(".tw2gui_combobox_list div.tw2gui_groupframe_content_pane")
						.last()
					if (!$contentPane.length) return
					const $groupframe = $contentPane.closest(".tw2gui_groupframe")
					const ScrollpaneCtor = window.west?.gui?.Scrollpane
					if (ScrollpaneCtor) {
						const scrollpane = new ScrollpaneCtor()
						const $spMain = $(scrollpane.getMainDiv())
						const $spContent = $(scrollpane.getContentPane())
						$spMain.css({
							maxHeight: `${maxHeight}px`,
							width: `${width}px`,
						})
						$spContent.append($contentPane.children())
						$contentPane.empty().append($spMain)
						if ($groupframe.length) {
							$groupframe.addClass("has-scrollbar")
						}
					} else {
						$contentPane.css({
							maxHeight: `${maxHeight}px`,
							width: `${width}px`,
							overflowY: "auto",
							overflowX: "hidden",
						})
						if ($groupframe.length) {
							$groupframe.addClass("has-scrollbar")
						}
					}
				} catch (e) {
					ErrorModule.report(e, Language._("errors.lang_combobox_scroll"))
				}
			}
		})(langCombobox, 256, 196)
		langs.forEach(function (l) {
			const variantName = Language._(`script.lang_names.${l.locale}`, l.lang_name)
			let flagHTML

			if (l.name === "English" && Array.isArray(l.svgFlagCodes)) {
				// Combine half US + half GB flags
				flagHTML = `<span style="display:inline-block;position:relative;width:18px;height:16px;vertical-align:middle;top:-1px;margin-right:4px;"><span style="position:absolute;left:0;top:0;width:9px;height:16px;overflow:hidden;"><img src="https://login.innogames.de/img/flags/country/4x3/${l.svgFlagCodes[0]}.svg" alt="${l.name}" style="width:18px;height:auto;position:relative;top:-1px;border:1px solid #000;box-sizing:border-box;"></span><span style="position:absolute;right:0;top:0;width:9px;height:16px;overflow:hidden;"><img src="https://login.innogames.de/img/flags/country/4x3/${l.svgFlagCodes[1]}.svg" alt="${l.name}" style="width:18px;height:auto;position:relative;left:-9px;top:-1px;border:1px solid #000;box-sizing:border-box;"></span></span>`
			} else {
				const flagCode = l.svgFlagCode || l.svgFlagCodes?.[0] || ""
				flagHTML = `<span style="display:inline-block;position:relative;width:18px;height:16px;vertical-align:middle;top:-1px;margin-right:4px;"><img src="https://login.innogames.de/img/flags/country/4x3/${flagCode}.svg" alt="${l.name}" style="width:18px;height:auto;vertical-align:middle;border:1px solid #000;box-sizing:border-box;position:relative;top:-1px;margin-right:4px;"></span>`
			}

			langCombobox.addItem(
				l.locale,
				`<span style="display:inline-block;height:16px;line-height:14px;vertical-align:middle;margin-left:4px;">${flagHTML}<span style="/*!top:-1px;*/position:relative;">${l.name} (${variantName})</span></span>`
			)
		})
		langCombobox.select(TWDB.script.preferences.lang || "en_DK")
		// Store selected language value (will be applied on save)
		let pendingLang = TWDB.script.preferences.lang || "en_DK"

		// Function to update translator text based on selected language
		const updateTranslatorText = function (locale) {
			const selectedLang = langs.find(l => l.locale === locale)
			if (selectedLang?.translator) {
				translatorNameSpan.text(selectedLang.translator)
				translatorText.show()
			} else {
				translatorNameSpan.text(Language._("settings.translation_off", "Translation not available"))
				translatorText.show()
			}
		}

		// Update translator text for initial selection
		updateTranslatorText(pendingLang)

		langCombobox.addListener(function (val) {
			// Just store the selected value, don't load language yet
			pendingLang = val
			updateTranslatorText(val)
		})

		langRow.append(langLabel).append(langCombobox.getMainDiv())
		langContainer.append(langRow).append(translatorText)
		settingsContentContainer.prepend(langContainer)
		const groupedSettingsContainers = {}
		settingOptions.forEach(option => {
			if (option.type === "category") {
				settingsContentContainer.append(
					$(`<div class='settings-category-header' />`).text(twiceHTMLUnescape(option.title))
				)
				return
			}
			const isChecked = cache.get(option.id)
			const checkboxHandler = (function (id) {
				return function () {
					cache.set(id, !cache.get(id))
				}
			})(option.id)
			const checkboxGui = new west.gui.Checkbox(
				"",
				!isChecked ? "" : "tw2gui_checkbox_checked",
				checkboxHandler
			)
			const checkboxElement = checkboxGui.getMainDiv()
			const settingItem = $("<div class='settings-item' />")
			settingItem.append($('<div class="settings-item-checkbox" />').append(checkboxElement))
			const labelTextElement = $(`<div class="settings-item-label" />`).text(
				twiceHTMLUnescape(option.text)
			)
			// Only the label toggles to avoid double-toggles from the checkbox widget itself.
			labelTextElement.on("click", function () {
				checkboxGui.toggle()
			})
			settingItem.append(labelTextElement)
			if (option.group) {
				if (!groupedSettingsContainers[option.group]) {
					const groupHeader = $(
						`<div class="settings-group-header"><span class="icon butMinus"></span><span>${twiceHTMLUnescape(option.group)}</span></div>`
					)
					const groupContent = $("<div class='settings-group-content' />")
					groupHeader.click(function () {
						groupContent.toggle()
						$(this).find(".icon").toggleClass("butMinus").toggleClass("butPlus")
					})
					settingsContentContainer.append(groupHeader)
					settingsContentContainer.append(groupContent)
					groupedSettingsContainers[option.group] = groupContent
				}
				groupedSettingsContainers[option.group].append(settingItem)
			} else {
				settingsContentContainer.append(settingItem)
			}
		})
		try {
			const whisperSoundContainer = $("<div class='beeper-sound-settings' />")
			const currentSoundSetting = cache.get("beeperSound", 9)
			const soundCombobox = new west.gui.Combobox("beeper_change_sound_settings")
				.addItem(0, Language._("misc.sound_default"))
				.addItem(1, "Bum")
				.addItem(2, "Chime")
				.addItem(3, "Coin")
				.addItem(4, "Coin 2")
				.addItem(5, "ICQ")
				.addItem(6, "QIP")
				.addItem(7, "Tinkle")
				.addItem(8, "Trumpet")
				.addItem(9, "VK")
				.addItem(10, `${Language._("common.select_file")}...`)
				.select(typeof currentSoundSetting === "string" ? 10 : currentSoundSetting)
				.addListener(function (value) {
					const stored = cache.get("beeperSound", 9)
					let nextValue = value
					if (value === 10 || value === "10") {
						const exampleUrl = "https://example.com/sound.mp3"
						const input = prompt(`${Language._("common.select_file")}:`, exampleUrl)
						if (!input && input !== exampleUrl) {
							soundCombobox.select(typeof stored === "string" ? 10 : stored)
							return
						}
						nextValue = input
					} else if (typeof value === "string" && /^-?\d+$/.test(value)) {
						nextValue = parseInt(value, 10)
					}
					cache.set("beeperSound", nextValue)
					if (window.ChatBeeper && typeof window.ChatBeeper.updateSound === "function") {
						window.ChatBeeper.updateSound()
					}
				})
			const listenButton = new west.gui.Button(Language._("common.listen"), function () {
				if (window.ChatBeeper && typeof window.ChatBeeper.play === "function") {
					window.ChatBeeper.play()
				}
			}).getMainDiv()
			whisperSoundContainer.append(soundCombobox.getMainDiv(), $(listenButton))
			settingsContentContainer.append(whisperSoundContainer)
		} catch (e) {
			ErrorModule.report(e, Language._("errors.setup_whisper_sound"))
		}
		function showTextDialog(options) {
			const inputField = $('<input type="text" />')
				.css({
					width: "calc(100% - 10px)",
					maxWidth: "450px",
					padding: "5px",
					fontFamily: "monospace",
					fontSize: "11px",
					boxSizing: "border-box",
				})
				.val(options.initialText || "")
				.attr("placeholder", options.mode === "import" ? Language._("io.import_placeholder") : "")
			if (options.mode === "export") {
				inputField.on("focus", function () {
					this.select()
				})
			}
			const dialogContent = $("<div>")
				.css({ maxWidth: "470px" })
				.append(
					options.mode === "export"
						? $("<p>").text(Language._("io.export_copy_failed"))
						: $("<p>").text(Language._("io.import_paste_instructions")),
					inputField
				)
			const dialog = new west.gui.Dialog(options.title, dialogContent)
			if (options.mode === "import") {
				dialog.addButton(Language._("misc.import"), function () {
					if (options.onConfirm) {
						options.onConfirm(inputField.val())
					}
					this.close()
				})
			}
			dialog
				.addButton(
					options.mode === "export" ? Language._("common.close") : Language._("common.cancel"),
					function () {
						this.close()
						if (options.mode === "import") {
							new UserMessage(Language._("io.import_cancelled"), UserMessage.TYPE_INFO).show()
						}
					}
				)
				.show()
		}
		const exportButton = new west.gui.Button(Language._("misc.export"), function () {
			const settingsJson = JSON.stringify(settings, null, 2) // Pretty-print for readability
			console.log(
				`%c--- ${Language._("io.export_start")} ---`,
				"color: green; font-weight: bold; font-size: 1.2em;"
			)
			console.log(settingsJson)
			console.log(
				`%c--- ${Language._("io.export_end")} ---`,
				"color: green; font-weight: bold; font-size: 1.2em;"
			)
			if (navigator.clipboard?.writeText) {
				navigator.clipboard.writeText(settingsJson).then(
					function () {
						new UserMessage(
							Language._("io.export_clipboard_success"),
							UserMessage.TYPE_SUCCESS
						).show()
					},
					function (err) {
						console.warn(`${Language._("io.export_clipboard_failed")}: `, err)
						showTextDialog({
							title: `${Language._("misc.export")} ${Language._("io.settings")}`,
							initialText: settingsJson,
							mode: "export",
						})
					}
				)
			} else {
				showTextDialog({
					title: `${Language._("misc.export")} ${Language._("io.settings")}`,
					initialText: settingsJson,
					mode: "export",
				})
			}
		})
		const importButton = new west.gui.Button(Language._("misc.import"), async function () {
			if (!window.confirm(Language._("io.import_warning"))) {
				return
			}
			const performImport = function (settingsString) {
				if (!settingsString) {
					new UserMessage(Language._("io.import_no_data"), UserMessage.TYPE_INFO).show()
					return
				}
				console.log(
					`%c--- ${Language._("io.import_start")} ---`,
					"color: blue; font-weight: bold; font-size: 1.2em;"
				)
				console.log(`${Language._("io.import_json_preview")}: \n\n${settingsString}\n`)
				console.log(
					"%c------------------------------------------",
					"color: blue; font-weight: bold; font-size: 1.2em;"
				)
				try {
					const importedSettings = JSON.parse(settingsString)
					for (const key in importedSettings) {
						if (Object.hasOwn(importedSettings, key)) {
							settings[key] = importedSettings[key]
						}
					}
					Cache.save("settings", settings)
					new west.gui.Dialog(
						`${Language._("misc.import")} ${Language._("io.settings")}`,
						Language._("io.import_success_reload"),
						"ok"
					)
						.setModal(true, false, true)
						.show()
				} catch (error) {
					new UserMessage(Language._("io.import_error"), UserMessage.TYPE_ERROR).show()
					ErrorModule.report(error, `${Language._("io.import_error_log")}: `)
				}
			}
			try {
				if (!navigator.clipboard || !navigator.clipboard.readText) {
					throw new Error(Language._("errors.clipboard_not_supported"))
				}
				navigator.clipboard
					.readText()
					.then(
						function (str) {
							new UserMessage(
								Language._("io.import_clipboard_success"),
								UserMessage.TYPE_SUCCESS
							).show()
							performImport(str)
						},
						function (err) {
							console.warn(Language._("io.import_clipboard_failed"), err)
							new UserMessage(
								Language._("io.import_clipboard_failed"),
								UserMessage.TYPE_INFO
							).show()
							throw err
						}
					)
					.catch(function () {
						showTextDialog({
							title: `${Language._("misc.import")} ${Language._("io.settings")}`,
							initialText: "",
							mode: "import",
							onConfirm: performImport,
						})
					})
			} catch (error) {
				ErrorModule.report(error, Language._("errors.clipboard_import_failed"))
				showTextDialog({
					title: `${Language._("misc.import")} ${Language._("io.settings")}`,
					initialText: "",
					mode: "import",
					onConfirm: performImport,
				})
			}
		})
		const saveButton = new west.gui.Button(Language._("common.save"), function () {
			// Save settings (language will be saved only if OK is clicked)
			saveSettings(settings, pendingLang)
		})
		const resetButton = $(
			`<div style="position: absolute; right: 0; top: calc(100% - 18px); width: auto; text-align: right;" />`
		).append(
			$(
				`<img style="cursor:pointer;" title="${Language._("misc.reset")} ${Language._("io.settings")}" src="${Images.iconReset}" />`
			).click(function () {
				Cache.reset()
				//new UserMessage(Language._("cache.reset_complete"), UserMessage.TYPE_INFO).show()
				// Optionally reload the settings tab to reflect changes
				renderSettingsTab()
			})
		)
		scrollpane.appendContent(settingsContentContainer)
		settingsWindowTab
			.append(saveButton.getMainDiv())
			.append(exportButton.getMainDiv())
			.append(importButton.getMainDiv())
			.append(resetButton)
		Window.hideLoader()
	}
	cache.get = function (key, defaultValue) {
		if (!isDefined(settings[key])) {
			cache.set(key, defaultValue)
			return defaultValue
		}
		return settings[key]
	}
	cache.set = function (key, value) {
		settings[key] = value
		// Save immediately for certain keys that need persistence
		const immediateSaveKeys = ["pinnedItems", "mini_chat_min", "beeperSound", "cemetery_critical"]
		if (immediateSaveKeys.includes(key)) {
			Cache.save("settings", settings)
		}
	}
	// Saves the settings to cache
	const saveSettings = function (newSettings, newLang) {
		new west.gui.Dialog(Language._("common.save"), Language._("settings.save_to_reload"), "warning")
			.addButton(Language._("common.ok"), function () {
				// Update settings
				for (const key in newSettings) {
					if (Object.hasOwn(newSettings, key)) {
						settings[key] = newSettings[key]
					}
				}
				// Update language preference if changed
				if (isDefined(newLang) && newLang !== TWDB.script.preferences.lang) {
					TWDB.script.preferences.lang = newLang
					localStorage.setItem("TWDB_preferences", JSON.stringify(TWDB.script.preferences))
				}
				// Save settings to cache
				if (Cache.save("settings", settings)) {
					window.location.reload()
				} else {
					new UserMessage(Language._("common.save_error"), UserMessage.TYPE_ERROR).show()
				}
			})
			.addButton(Language._("common.cancel"))
			.show()
		// Apply max-width to the dialog
		// $(dialog.divMain).css("max-width", "380px")
		TWDB.Util.addCss(
			`.tw2gui_dialog{margin:0!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)}.tw2gui_dialog_content{width:460px}`
		)
	}
	// Export langs array via getLangs method
	cache.getLangs = function () {
		return langs
	}
	return cache // Return the cache object as the public interface
})($)
_base.Settings = Settings
Debugger.Settings = Settings


/**
 * Language code conversion utility module.
 * Provides functions to convert between different language code formats:
 * - locale_with_underscore: For Game.locale and storage (e.g., "pt_BR", "en_DK")
 * - two_letters_code: For Google Translate API (e.g., "pt-BR", "pt-PT", "en", "el")
 * - svg_flag_code: For SVG flag links (e.g., "br", "dk")
 *
 * This module reads from Settings.js langs array as the single source of truth.
 */
TWDB.LanguageCodes = (function () {
	/**
	 * Get the langs array from Settings module.
	 * @returns {Array} Array of language definitions
	 */
	function getLangsArray() {
		if (typeof Settings !== "undefined" && Settings && typeof Settings.getLangs === "function") {
			return Settings.getLangs()
		}
		// Fallback: return empty array if Settings not available
		return []
	}

	/**
	 * Find a language entry by any format (locale, twoLettersCode, etc.)
	 * @param {string} input - Language code in any format
	 * @returns {Object|null} Language entry or null if not found
	 */
	function findLangEntry(input) {
		if (!input) return null
		const langs = getLangsArray()
		// Try to find by locale_with_underscore
		let found = langs.find(l => l.locale === input)
		if (found) return found
		// Try to find by twoLettersCode
		found = langs.find(l => l.twoLettersCode === input)
		if (found) return found
		// Try to find by svgFlagCode
		found = langs.find(l => l.svgFlagCode === input)
		if (found) return found
		// Try to find in svgFlagCodes array (for English)
		found = langs.find(l => Array.isArray(l.svgFlagCodes) && l.svgFlagCodes.includes(input))
		if (found) return found
		return null
	}

	/**
	 * Get locale_with_underscore format from any input format.
	 * @param {string} input - Language code in any format
	 * @returns {string|null} Locale format (e.g., "pt_BR", "en_DK") or null if not found
	 */
	function getLocaleWithUnderscore(input) {
		const entry = findLangEntry(input)
		return entry ? entry.locale : null
	}

	/**
	 * Get two_letters_code format from any input format.
	 * @param {string} input - Language code in any format
	 * @returns {string|null} Two letters code format (e.g., "pt-BR", "en") or null if not found
	 */
	function getTwoLettersCode(input) {
		const entry = findLangEntry(input)
		return entry ? entry.twoLettersCode : null
	}

	/**
	 * Get svg_flag_code format from any input format.
	 * @param {string} input - Language code in any format
	 * @returns {string|null} SVG flag code (e.g., "br", "dk") or null if not found
	 */
	function getSvgFlagCode(input) {
		const entry = findLangEntry(input)
		if (!entry) return null
		// For English, return first flag code from array
		if (Array.isArray(entry.svgFlagCodes)) {
			return entry.svgFlagCodes[0] || null
		}
		return entry.svgFlagCode || null
	}

	/**
	 * Get svg_flag_codes array (for languages with multiple flags like English).
	 * @param {string} input - Language code in any format
	 * @returns {Array<string>|null} SVG flag codes array or null if not found
	 */
	function getSvgFlagCodes(input) {
		const entry = findLangEntry(input)
		if (!entry) return null
		return entry.svgFlagCodes || null
	}

	/**
	 * Get mapping of all locales to their two_letters_code for Google Translate API.
	 * @returns {Object} Map of locale_with_underscore to two_letters_code
	 */
	function getLanguageCodeMap() {
		const langs = getLangsArray()
		const map = {}
		langs.forEach(lang => {
			if (lang.locale && lang.twoLettersCode) {
				map[lang.locale] = lang.twoLettersCode
			}
		})
		return map
	}

	/**
	 * Get all available locales in locale_with_underscore format.
	 * @returns {Array<string>} Array of locale strings
	 */
	function getAllLocales() {
		const langs = getLangsArray()
		return langs.map(lang => lang.locale).filter(Boolean)
	}

	return {
		getLocaleWithUnderscore,
		getTwoLettersCode,
		getSvgFlagCode,
		getSvgFlagCodes,
		getLanguageCodeMap,
		getAllLocales,
		getLangsArray,
	}
})()


const Updater = (function (e) {
	const updaterApi = {}
	let readyState = {}
	let notesTab
	let wasUpdatedFlag = false
	const initializeUpdater = function () {
		if (readyState.ready) {
			return
		}
		try {
			notesTab = Window.addTab(
				"notes",
				Language._("updater.version_features_title"),
				Language._("updater.version_features_title"),
				function () {
					renderVersionNotes()
				}
			)
			if (!Cache.load("version")) Cache.save("version", Script.version)
			else if (Script.version !== Cache.load("version")) {
				Cache.save("version", Script.version)
				wasUpdatedFlag = true
				const dialogTitle = Language._("updater.script_updated")
				const dialogMessage = `<div class="txcenter">${Language._("updater.script_updated_message", { script: `<b>${Script.name}</b>` })}</div>`
				new west.gui.Dialog(dialogTitle, dialogMessage, "warning")
					.addButton(Language._("common.no"))
					.addButton(Language._("common.yes"), function () {
						Window.open("notes")
					})
					.show()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.updater_initialize"))
		}
	}
	readyState = Loader.add("Updater", "tw-db Updater", initializeUpdater, {
		Cache: true,
		Window: true,
	})
	const showUpdateDialog = function (newVersion) {
		try {
			const dialogTitle = Language._("updater.script_needs_update")
			let dialogMessage = `<div class="txcenter">${Language._("updater.new_version_available", { script: `<b>${Script.name}</b>` })}</div>`
			dialogMessage += `<div><br />${Language._("updater.current_version")}: ${Script.version}<br />${Language._("updater.new_version")}: 0.${newVersion}</div>`
			const updateUrl = `${Script.protocol}://${Script.update_link}${Script.name_max}${Script.update_suffix}`
			const openUpdateUrl = function () {
				window.open(updateUrl)
				new west.gui.Dialog(Script.name, Language._("updater.reload_after_install"), "warning")
					.setModal(true, false, true)
					.show()
			}
			new west.gui.Dialog(dialogTitle, dialogMessage, west.gui.Dialog.SYS_WARNING)
				.addButton(Language._("common.not_now"))
				.addButton(Language._("common.ok"), openUpdateUrl)
				.show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.updater_show_dialog"))
		}
	}
	updaterApi.wasUpdated = function () {
		return wasUpdatedFlag
	}
	const renderVersionNotes = function () {
		try {
			notesTab.children().remove()
			const scrollPane = new west.gui.Scrollpane()
			e(scrollPane.getMainDiv()).css("height", "335px")
			let isFirstVersion = false
			for (let index = 0; index < Script.notes.length; index++) {
				const versionHeader = e(
					`<h3><a>${Language._("updater.version_label")} - ${Script.notes[index].version}</a></h3>`
				)
					.css("border-bottom", "1px solid black")
					.click(function () {
						e(this).next().toggle()
					})
				const notesContent = Array.isArray(Script.notes[index].notes)
					? Script.notes[index].notes.join("<br>")
					: Script.notes[index].notes
				const notesDiv = e(`<div>${notesContent}</div>`)
				scrollPane.appendContent(versionHeader).appendContent(notesDiv)
				if (isFirstVersion) {
					notesDiv.hide()
				}
				isFirstVersion = true
			}
			notesTab.append(scrollPane.getMainDiv())
			Window.hideLoader()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.updater_render_notes"))
		}
	}
	updaterApi.query = function () {
		setTimeout(function () {
			e.getScript(`${Script.protocol}://${Script.folder_url}${Script.check}?${Date.now()}`)
		}, 500)
	}
	updaterApi.check = function (versionString) {
		try {
			// Compare versions: Script.version is "0.27.0", versionString from version.js is "27.0"
			const currentVersion = Script.version.replace(/^0\./, "")
			if (currentVersion !== versionString) {
				showUpdateDialog(versionString)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.updater_check_version"))
		}
	}
	return updaterApi
})($)
_base.Updater = Updater
Debugger.Updater = Updater


const Sleep = (function (e) {
	const sleepApi = {}
	let sleepButton = null
	const fortList = []
	let fortDataList = []
	let barracksCache = {}
	const barracksCacheDays = 1
	const _u = false
	let readyState = {}
	let lastPosition
	let isProcessingClick = false
	let hotelDataCount = 0
	const townList = []
	const roomTypes = ["", "cubby", "bedroom", "hotel_room", "apartment", "luxurious_apartment"]
	const initializeSleepModule = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("direct_sleep", true)) {
				TWDB.Util.addCss(
					`ul.tw2gui_selectbox_content.twdb_sleepmenu{max-width:320px!important;white-space:nowrap;overflow-y:auto;overflow-x:hidden}ul.tw2gui_selectbox_content.twdb_sleepmenu>div.tw2gui_scrollpane{width:320px!important}ul.tw2gui_selectbox_content.twdb_sleepmenu>li{padding-right:20px!important}`
				)
				barracksCache = Cache.load("barracks")
				if (barracksCache === null || typeof barracksCache !== "object") {
					barracksCache = {}
				}
				addSleepButton()
				if (Character.homeTown.town_id !== 0) loadFortData()
				else loadAllianceTowns()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_initialize"))
		}
	}
	readyState = Loader.add("Sleep", "tw-db DirectSleep", initializeSleepModule, {
		Cache: true,
		Settings: true,
	})
	const addSleepButton = function () {
		try {
			if (!Images.buttonSleep) {
				waitForImages("buttonSleep", addSleepButton)
				return
			}
			sleepButton = GameInject.CharacterButton.add(Images.buttonSleep)
			sleepButton.addMousePopup(Language._("misc.sleep")).click(function (clickEvent) {
				if (w.Character.homeTown.town_id !== 0 && fortList.length === 0) sleepAtHome()
				else handleSleepClick(clickEvent)
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_add_button"))
		}
	}
	const showSleepMenu = function (locationList, clickEvent, locationCount) {
		try {
			const selectBox = new west.gui.Selectbox(true).addListener(function (selectedValue) {
				switch (selectedValue) {
					case "home":
						sleepAtHome()
						break
					default:
						sleepAtLocation(selectedValue)
						break
				}
			})
			if (w.Character.homeTown.town_id !== 0)
				selectBox.addItem(
					"home",
					`${Language._("misc.hotel")} ${w.GameMap.calcWayTime(lastPosition, w.Character.homeTown).formatDuration()}`
				)
			for (let index = 0; index < locationCount; index++)
				if (locationList[index].stage !== 0)
					selectBox.addItem(
						index,
						`${Language._("misc.stage")} ${locationList[index].stage} ${locationList[index].distance.formatDuration()} | ${locationList[index].name}`
					)
			e(selectBox.elContent).addClass("twdb_sleepmenu")
			selectBox.show(clickEvent)
			isProcessingClick = false
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_show_menu"))
			isProcessingClick = false
		}
	}
	const fetchHotelData = function (townIndex, totalCount, clickEvent) {
		try {
			Ajax.remoteCallMode(
				"building_hotel",
				"get_data",
				{ town_id: townList[townIndex].town_id },
				function (response) {
					if (response.error) return new UserMessage(response.msg).show()
					townList[townIndex].stage = response.hotel_level
					if (++hotelDataCount === totalCount) showSleepMenu(townList, clickEvent, totalCount)
				}
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_fetch_hotel_data"))
		}
	}
	const handleSleepClick = function (clickEvent) {
		if (isProcessingClick) return
		try {
			isProcessingClick = true
			lastPosition = MapModule.getLastPosition()
			if (w.Character.homeTown.town_id === 0) {
				for (let townIndex = 0; townIndex < townList.length; townIndex++)
					townList[townIndex].distance = w.GameMap.calcWayTime(lastPosition, townList[townIndex])
				townList.sort(function (a, b) {
					return a.distance - b.distance
				})
				const maxTowns = townList.length > 5 ? 5 : townList.length
				hotelDataCount = 0
				for (let townIndex2 = 0; townIndex2 < maxTowns; townIndex2++) {
					if (Object.hasOwn(townList[townIndex2], "stage")) {
						if (++hotelDataCount === maxTowns) showSleepMenu(townList, clickEvent, maxTowns)
					} else fetchHotelData(townIndex2, maxTowns, clickEvent)
				}
			} else {
				for (let fortIndex = 0; fortIndex < fortList.length; fortIndex++)
					fortList[fortIndex].distance = w.GameMap.calcWayTime(lastPosition, fortList[fortIndex])
				fortList.sort(function (a, b) {
					return a.distance - b.distance
				})
				showSleepMenu(fortList, clickEvent, fortList.length)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_handle_click"))
			isProcessingClick = false
		}
	}
	const sleepAtHome = function () {
		try {
			Ajax.remoteCallMode(
				"building_hotel",
				"get_data",
				{ town_id: w.Character.homeTown.town_id },
				function (response) {
					if (response.error) return new UserMessage(response.msg).show()
					const roomType = roomTypes[response.hotel_level]
					w.TaskQueue.add(new TaskSleep(w.Character.homeTown.town_id, roomType))
				}
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_at_home"))
		}
	}
	const sleepAtLocation = function (locationIndex) {
		try {
			if (isDefined(townList[locationIndex]))
				w.TaskQueue.add(
					new TaskSleep(townList[locationIndex].town_id, roomTypes[townList[locationIndex].stage])
				)
			else if (isDefined(fortList[locationIndex]))
				w.TaskQueue.add(
					new TaskFortSleep(
						fortList[locationIndex].id,
						fortList[locationIndex].x,
						fortList[locationIndex].y
					)
				)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_at_location"))
		}
	}
	const loadAllianceTowns = function () {
		try {
			Ajax.get("map", "get_minimap", {}, function (response) {
				if (response.error) return new UserMessage(response.msg).show()
				for (const townKey in response.towns)
					if (response.towns[townKey].member_count) townList.push(response.towns[townKey])
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_load_alliance_towns"))
		}
	}
	const loadFortData = function () {
		try {
			if (w.Character.homeTown.alliance_id === 0)
				Ajax.remoteCall("fort_overview", "", {}, function (response) {
					for (const fortKey in response.js) {
						const fortInfo = response.js[fortKey]
						const fortMatch = response.page.match(
							new RegExp(
								`<div id="ownforts">[\\S\\s]+FortWindow.open\\(undefined, ${fortInfo[1]}, ${fortInfo[2]})\\)">(.+?)</a>[\\S\\s]+<div id="lastbattle">`
							)
						)
						if (fortMatch)
							fortDataList.push({
								fort_id: fortInfo[0],
								x: fortInfo[1],
								y: fortInfo[2],
								name: fortMatch[1],
							})
					}
					if (fortDataList.length > 0)
						w.setTimeout(function () {
							processFortData()
						}, Timer.getTimeout())
				})
			else
				Ajax.remoteCallMode(
					"alliance",
					"get_data",
					{ alliance_id: w.Character.homeTown.alliance_id },
					function (response) {
						if (response.error) return new UserMessage(response.error).show()
						fortDataList = response.data.forts
						if (fortDataList.length > 0)
							w.setTimeout(function () {
								processFortData()
							}, Timer.getTimeout())
					}
				)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_load_fort_data"))
		}
	}
	const processFortData = function () {
		try {
			if (fortDataList.length <= 0) {
				return
			}
			const fortInfo = fortDataList.pop()
			const fortId = fortInfo.fort_id
			if (!isDefined(barracksCache[fortId])) {
				barracksCache[fortId] = { time: 0, stage: 0 }
			}
			e.extend(barracksCache[fortId], {
				id: fortId,
				x: fortInfo.x,
				y: fortInfo.y,
				name: fortInfo.name,
			})
			if (
				barracksCache[fortId].stage !== 5 &&
				barracksCache[fortId].time + barracksCacheDays * 86400 > Date.now() / 1e3
			) {
				fortList.push(barracksCache[fortId])
				if (fortDataList.length > 0) {
					w.setTimeout(function () {
						processFortData()
					}, Timer.getTimeout())
				} else {
					Cache.save("barracks", barracksCache)
				}
				return
			}
			Ajax.remoteCallMode(
				"fort_building_barracks",
				"index",
				{ fort_id: fortId },
				function (response) {
					if (response.error) {
						new UserMessage(response.error).show()
					} else {
						barracksCache[fortId].time = Math.floor(Date.now() / 1e3)
						if (isDefined(response.barrackStage)) {
							barracksCache[fortId].stage = response.barrackStage
						}
						if (
							barracksCache[fortId].stage !== 5 &&
							barracksCache[fortId].time + barracksCacheDays * 86400 > Date.now() / 1e3
						) {
							fortList.push(barracksCache[fortId])
						}
						if (fortDataList.length > 0) {
							w.setTimeout(function () {
								processFortData()
							}, Timer.getTimeout())
						} else {
							Cache.save("barracks", barracksCache)
						}
					}
				}
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.sleep_process_fort_data"))
		}
	}
	return sleepApi
})($)
Debugger.Sleep = Sleep


const Analyzer = (function (jQuery) {
	const publicApi = {}
	let statisticData = null
	let initialStatisticSnapshot = null
	let isReportFetchingActive = false
	let reportFetchQueue = []
	const failedReportIds = []
	let currentReportFetchPage = 0
	const uiState = {
		currentWindowElement: null,
		progressBar: null,
		tableRows: [],
		tableFooter: null,
		tableBodyScrollpane: null,
	}
	let sortAndDisplayState = {
		order: 1,
		sortByColumn: 0,
		displayMode: "avg",
	}
	let analyzerLoaderConfig = {}
	publicApi.extra = false
	// Reset analyzer statistics (optionally starting from a given report/link).
	function executeStatisticReset(type, initialValue) {
		let processedValue
		if (!initialValue) {
			processedValue = 0
		} else {
			const reportRegex = /\[report=([0-9]+)([A-Fa-f0-9]{10})\]/
			const match = String(initialValue).match(reportRegex)
			if (match) {
				processedValue = match[1] // Extract the report ID
			} else {
				processedValue = initialValue // Use original value if no match
			}
		}
		let finalValue
		const parsedValue = parseInt(processedValue, 10)
		if (Number.isNaN(parsedValue)) {
			finalValue = 0
		} else {
			finalValue = parsedValue - 1
		}
		switch (type) {
			case "job":
				statisticData[type] = { last: finalValue, items: { last: 0 } }
				break
			case "duel":
				statisticData[type] = { last: finalValue }
				break
			case "chest":
				statisticData[type] = {}
				break
			case "all":
				statisticData = { ver: 4 } // Uses 'statisticData'
				// Recursively call for individual types with a reset start point
				executeStatisticReset("job", finalValue + 1)
				executeStatisticReset("duel", finalValue + 1)
				executeStatisticReset("chest", finalValue + 1)
				break
		}
	}
	// Confirm + trigger a statistics reset for a given analyzer type.
	function showResetConfirmationDialog(type) {
		const dialogContent = jQuery(
			`<div><h2>${Language._("analyzer.reset_confirm_title")}</h2><span style="font-size:12px"><br />${Language._("analyzer.reset_confirm_message")}</span></div>`
		)
		const linkTextfield = new west.gui.Textfield("twdb_analyzer_last").setSize(40)
		linkTextfield.setLabel(Language._("analyzer.report_link_label"))
		dialogContent.append(linkTextfield.getMainDiv())
		const useAllCheckbox = new west.gui.Checkbox(
			`${Language._("analyzer.use_all_reports")}&nbsp;&nbsp;`
		)
		const useFutureCheckbox = new west.gui.Checkbox(`${Language._("analyzer.use_future_reports")}`)
		useAllCheckbox.setCallback(function (checked) {
			if (checked) {
				useFutureCheckbox.setSelected(false)
				linkTextfield.setValue("")
			}
		})
		useFutureCheckbox.setCallback(function (checked) {
			if (checked) {
				useAllCheckbox.setSelected(false)
				linkTextfield.setValue("")
			}
		})
		jQuery(linkTextfield.getMainDiv()).find("span").css("font-size", "12px")
		jQuery(linkTextfield.getMainDiv())
			.find("input")
			.keyup(function () {
				useAllCheckbox.setSelected(false)
				useFutureCheckbox.setSelected(false)
			})
		dialogContent.append(
			jQuery('<div style="display:block;" />')
				.append(useAllCheckbox.getMainDiv())
				.append(useFutureCheckbox.getMainDiv())
		)
		const dialog = new west.gui.Dialog(Language._("analyzer.reset_report_analyzer"), dialogContent)
		dialog.addButton(Language._("common.ok"), function () {
			if (useAllCheckbox.isSelected()) {
				executeStatisticReset(type)
			} else if (useFutureCheckbox.isSelected()) {
				executeStatisticReset(type, statisticData[type].last + 1)
			} else {
				executeStatisticReset(type, linkTextfield.getValue())
			}
			dialog.hide()
			MessagesWindow.open(`analyzer-${type}`)
		})
		dialog.addButton(Language._("common.cancel"))
		dialog.show()
	}
	// Reset dispatcher: either run immediately or show confirmation dialog.
	const dispatchResetAction = function (type, shouldExecuteImmediately = false, initialValue) {
		if (shouldExecuteImmediately) {
			executeStatisticReset(type, initialValue)
		} else {
			showResetConfirmationDialog(type)
		}
	}
	// Report fetching + processing.
	// Start fetching reports for a given type.
	const startReportFetchProcess = function (type) {
		if (isReportFetchingActive) return
		isReportFetchingActive = true
		reportFetchQueue = [] // Clear previous queue
		currentReportFetchPage = 0 // Reset page counter
		fetchReportsPage(type, 1)
	}
	// Fetch a single page of reports.
	const fetchReportsPage = function (type, pageNum) {
		if (!pageNum) {
			pageNum = 1
		}
		currentReportFetchPage = pageNum
		Ajax.remoteCall("reports", "get_reports", { page: pageNum, folder: type }, function (response) {
			processFetchedReportsResponse(type, response)
		})
	}
	// Parse the reports list and populate the fetch queue.
	const processFetchedReportsResponse = function (type, response) {
		let continueFetching = true
		if (typeof response.reports !== "object" || response.reports === null) {
			response.reports = []
			continueFetching = false
		}
		// Ensure we are processing the page we requested, helps with out-of-order responses
		if (typeof response.page === "undefined" || currentReportFetchPage !== response.page) {
			response.reports = []
			continueFetching = false
		}
		for (let i = 0; i < response.reports.length; i++) {
			const report = response.reports[i]
			// Stop if we encounter a report that's already processed
			if (report.report_id <= statisticData[type].last) {
				continueFetching = false
				break
			}
			reportFetchQueue.push({ id: report.report_id, hash: report.hash, type: type })
		}
		uiState.progressBar.setMaxValue(reportFetchQueue.length) // Update progress bar max value
		if (continueFetching) {
			window.setTimeout(
				() => fetchReportsPage(type, currentReportFetchPage + 1),
				Timer.getTimeout()
			)
		} else {
			processNextReportFromQueue(type) // Start processing the gathered reports
		}
	}
	// Process queued reports sequentially.
	const processNextReportFromQueue = function (type) {
		if (reportFetchQueue.length > 0) {
			uiState.progressBar.setValue(uiState.progressBar.getValue() + 1)
			fetchSingleReportDetails(reportFetchQueue.pop()) // Pop and fetch oldest report
		} else {
			Cache.save("statistic", statisticData)
			isReportFetchingActive = false
			displayAnalyzerTab(type, true) // Refresh UI with new data
		}
	}
	// Fetch report details (JSON) for a queued report.
	const fetchSingleReportDetails = function (reportMeta) {
		jQuery.post(
			"game.php?window=reports&mode=show_report",
			{ flash: null, hash: reportMeta.hash, report_id: reportMeta.id },
			function (reportDetails) {
				handleFetchedReportDetails(reportMeta.type, reportDetails)
			},
			"json"
		)
	}
	// Parse a fetched report payload, persist stats, then continue the queue.
	const handleFetchedReportDetails = function (type, reportDetails) {
		if (!reportDetails || !reportDetails.report_id || !reportDetails.publishHash) {
			new UserMessage(Language._("errors.empty_server_response"), UserMessage.TYPE_ERROR).show()
			return false
		}
		if (
			typeof reportDetails.page !== "string" ||
			typeof reportDetails.title !== "string" ||
			typeof reportDetails.js !== "string"
		) {
			failedReportIds.push(reportDetails.report_id) // Malformed report
		} else {
			switch (type) {
				case "job":
					parseAndStoreJobReport(reportDetails) // Calls specific parser
					break
				case "duel":
					parseAndStoreDuelReport(reportDetails) // Calls specific parser
					break
			}
			statisticData[type].last = reportDetails.report_id // Update last processed report ID
		}
		window.setTimeout(() => processNextReportFromQueue(type), Timer.getTimeout())
	}
	// Parse and store a Job report into analyzer statistics.
	const parseAndStoreJobReport = function (reportDetails) {
		const jobData = {
			id: null,
			hash: null,
			job: null,
			motivation: null,
			duration: null,
			wage: null,
			bond: null,
			experience: null,
			injury: 0,
			killed: false,
			date_received: null,
			items: {},
		}
		try {
			jobData.id = reportDetails.report_id
			jobData.hash = reportDetails.publishHash
			const jobInfo = Jobs.getJobByName(
				reportDetails.title.slice(reportDetails.title.indexOf(":") + 1)
			)
			if (!jobInfo) {
				failedReportIds.push(jobData.id)
				return false
			}
			jobData.job = jobInfo.id
			jobData.date_received = reportDetails.date_received
			const reportPage = jQuery(reportDetails.page)
			reportPage.find(".rp_row_jobdata").each(function (idx) {
				let valueText = jQuery.trim(jQuery(this).children("span:last-child").html())
				valueText = valueText.split("&nbsp;").join(" ") // Normalize spaces
				switch (idx) {
					case 0:
						jobData.motivation = parseInt(valueText.slice(0, valueText.indexOf(" ")), 10)
						break
					case 1: {
						const durationFloat = parseFloat(valueText)
						jobData.duration =
							durationFloat === 1
								? 3600
								: durationFloat === 10
									? 600
									: durationFloat === 15
										? 15
										: null
						if (!jobData.duration) {
							ErrorModule.report(
								{ message: `Unrecognized time on report:${valueText}` },
								"Job-Analyzer"
							)
						}
						break
					}
					case 2:
						jobData.wage = parseInt(valueText.slice(valueText.indexOf(" ") + 1), 10)
						break
					case 3:
						jobData.bond = parseInt(valueText, 10)
						break
					case 4:
						jobData.experience = parseInt(valueText.slice(0, valueText.indexOf(" ")), 10)
						break
				}
			})
			reportPage.find(".rp_hurtmessage_text").each(function () {
				const regex = /[0-9]+/
				jobData.injury = Number(regex.exec(jQuery(this).html()))
			})
			reportPage.find(".rp_row_killmessage").each(function () {
				jobData.killed = true
			})
			const jsCodeLines = reportDetails.js.split(";")
			jQuery(jsCodeLines).each(function () {
				const itemRegex = /\s*ItemManager\.get\(([0-9]+)\)\s*\)\.setCount\(([0-9]+)\)/m
				const match = itemRegex.exec(this)
				if (match) {
					jobData.items[Number(match[1])] = Number(match[2])
				}
			})
			// Update statisticData
			if (!statisticData.job[jobData.job]) {
				statisticData.job[jobData.job] = { count: 0, products: {} }
			}
			const jobStats = statisticData.job[jobData.job]
			jobStats.count++
			if (!jobStats[jobData.motivation]) {
				jobStats[jobData.motivation] = {
					count: 0,
					duration: 0,
					wage: 0,
					bond: 0,
					experience: 0,
					injury: {},
					killed: 0,
					items: {},
					extraitems: {},
				}
			}
			const motivationStats = jobStats[jobData.motivation]
			if (!isDefined(motivationStats.duration)) {
				motivationStats.duration = 0
			}
			motivationStats.count++
			motivationStats.duration += jobData.duration
			motivationStats.wage += jobData.wage
			motivationStats.bond += jobData.bond
			motivationStats.experience += jobData.experience
			if (!motivationStats.injury[jobData.injury]) {
				motivationStats.injury[jobData.injury] = 0
			}
			motivationStats.injury[jobData.injury]++
			if (jobData.killed) {
				motivationStats.killed++
			}
			for (const itemId in jobData.items) {
				const parsedItemId = Number(itemId)
				const bountyBagId = 138000 // Specific item ID
				// Handle Bounty Bags (specific extra item)
				if (parsedItemId === bountyBagId) {
					if (!isDefined(statisticData.extra)) {
						statisticData.extra = { count: 0 }
						publicApi.extra = true // Flag for public API if extra is present
					}
					statisticData.extra.count++
					statisticData.extra[statisticData.extra.count] = jobData
				}
				const itemCount = jobData.items[parsedItemId]
				const itemObject = ItemManager.get(parsedItemId)
				// Handle Job Products
				if (Jobs.isProduct(parsedItemId) !== -1) {
					if (!jobStats.products[parsedItemId]) {
						jobStats.products[parsedItemId] = { last: 0 }
					}
					const productStats = jobStats.products[parsedItemId]
					for (let k = 0; k < itemCount; k++) {
						const occurrencesSinceLast = jobStats.count - productStats.last
						productStats.last = jobStats.count
						if (!productStats[occurrencesSinceLast]) {
							productStats[occurrencesSinceLast] = 0
						}
						productStats[occurrencesSinceLast]++
					}
				}
				// Handle Extra Items (price 0)
				else if (itemObject.price === 0) {
					if (!motivationStats.extraitems[parsedItemId]) {
						motivationStats.extraitems[parsedItemId] = 0
					}
					motivationStats.extraitems[parsedItemId]++
				}
				// Handle other general items (luck-related)
				else {
					// luck = true; // This 'luck' variable is unused and undeclared here, likely a remnant
					if (!motivationStats.items[parsedItemId]) {
						motivationStats.items[parsedItemId] = 0
					}
					motivationStats.items[parsedItemId]++
				}
			}
		} catch (error) {
			failedReportIds.push(jobData.id)
			ErrorModule.report(error, Language._("errors.analyzer_parse_job_report"))
			return false
		}
	}
	// Duel reports are not implemented (placeholder).
	const parseAndStoreDuelReport = function (_reportData) {}
	// UI: render the analyzer tab and trigger report processing if needed.
	const displayAnalyzerTab = function (type, forceRefresh) {
		if (!MessagesWindow.window) return
		uiState.currentWindowElement = jQuery(MessagesWindow.window.getContentPane()).find(
			`.messages-analyzer-${type}`
		)
		if (typeof forceRefresh === "undefined") {
			MessagesWindow.window.showLoader()
			uiState.progressBar = new west.gui.Progressbar(0, reportFetchQueue.length) // Initialize with 0 max
			uiState.currentWindowElement.children().remove()
			uiState.currentWindowElement.append(uiState.progressBar.getMainDiv())
			startReportFetchProcess(type)
		} else {
			uiState.currentWindowElement.children().remove()
			let contentElement
			switch (type) {
				case "job":
					contentElement = renderJobAnalyzerTable()
					break
				case "duel":
					contentElement = renderDuelAnalyzerTable()
					break // showDuels
			}
			uiState.currentWindowElement.append(contentElement)
			applyTableSorting() // Apply sorting after render
			applyTableDisplayMode() // Apply sum/avg after render
			applyTableSorting() // Called again as in original, perhaps for consistency with default sort?
			MessagesWindow.window.hideLoader()
		}
	}
	// Sort the job analyzer table based on the current state (or a clicked column).
	const applyTableSorting = function (columnIndex) {
		try {
			if (typeof columnIndex !== "undefined") {
				if (sortAndDisplayState.sortByColumn === columnIndex) {
					sortAndDisplayState.order *= -1 // Toggle order if same column
				} else {
					sortAndDisplayState.order = 1 // Default to ascending for new column
					sortAndDisplayState.sortByColumn = columnIndex
				}
			} else {
				columnIndex = sortAndDisplayState.sortByColumn // Use current state if no new column given
			}
			const currentOrder = sortAndDisplayState.order
			const sortFunction = (row1, row2) => {
				const val1 = jQuery(row1).find(`.cell_${columnIndex}`).html()
				const val2 = jQuery(row2).find(`.cell_${columnIndex}`).html()
				if (Number(val1) === parseFloat(val1)) {
					return parseFloat(val1) > parseFloat(val2) ? currentOrder : -currentOrder
				} else {
					return val1 > val2 ? currentOrder : -currentOrder
				}
			}
			uiState.tableRows.sort(sortFunction)
			for (let i = 0; i < uiState.tableRows.length; i++) {
				uiState.tableBodyScrollpane.appendContent(uiState.tableRows[i])
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.analyzer_apply_table_sorting"))
		}
	}
	// Toggle between sum and avg display mode for table cells.
	const applyTableDisplayMode = function () {
		sortAndDisplayState.displayMode = sortAndDisplayState.displayMode === "avg" ? "sum" : "avg"
		jQuery(uiState.currentWindowElement)
			.find("div.row div")
			.each(function (_param) {
				const element = jQuery(this)
				const displayValue = element.data(String(sortAndDisplayState.displayMode))
				const titleValue = element.data(`${String(sortAndDisplayState.displayMode)}-t`)
				element.html(displayValue).attr("title", titleValue)
			})
	}
	// Render the Job Analyzer table and populate it from cached statistics.
	const renderJobAnalyzerTable = function () {
		uiState.currentWindowElement.addClass("view-rewards")
		sortAndDisplayState = { order: 1, sortByColumn: 0, displayMode: "avg" }
		const tableHtml = jQuery(
			`<div class="fancytable"><div class="_bg tw2gui_bg_tl"></div><div class="_bg tw2gui_bg_tr"></div><div class="_bg tw2gui_bg_bl"></div><div class="_bg tw2gui_bg_br"></div><div class="trows"><div class="thead statics"><div class="row row_head"><div class="cell_0 view-rewards view-items" style="width:91px; text-align:center;"><span title="${Language._("misc.name")}" style="cursor:pointer, margin-bottom:3px;"><img src="${Images.iconName}"/></span></div><div class="cell_1 view-rewards view-items" style="width:50px; text-align:center;"><span title="${Language._("misc.count")}"><img src="${Images.iconCount}"/></span></div><div class="cell_2 view-rewards view-items" style="width:50px; text-align:center;"><span title="${Language._("misc.duration")}"><img src="${Images.iconClock}"/></span></div><div class="cell_3 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.experience")}"><img src="${Images.iconExperience}"/></span></div><div class="cell_4 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.money")}"><img src="${Images.iconDollar}"/></span></div><div class="cell_5 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.bonds")}"><img src="${Images.iconUpb}"/></span></div><div class="cell_6 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.motivation")}"><img src="${Images.iconMoti}"/></span></div><div class="cell_7 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.danger")}"><img src="${Images.iconDanger}"/></span></div><div class="cell_8 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.killed")}"><img src="${Images.iconKilled}"/></span></div><div class="cell_9 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.yield")}"><img src="${Images.iconYield}"/></span></div><div class="cell_9 view-items" style="width:63px; text-align:center;"><span title="${Language._("misc.yield")}"><img src="${Images.iconYield}"/></span></div><div class="cell_10 view-rewards" style="width:50px; text-align:center;"><span title="${Language._("misc.items")}"><img src="${Images.iconItem}"/></span></div><div class="cell_10 view-items" style="width:378px; text-align:center;"><span title="${Language._("misc.items")}"><img src="${Images.iconItem}"/></span></div><div class="cell_11 view-rewards" style="width:41px; text-align:center;"><span title="${Language._("misc.luck")}"><img src="${Images.iconLuck}"/></span></div><div class="cell_reset view-rewards view-items" style="width:20px; text-align:right;"><span title="${Language._("misc.reset")}"><img src="${Images.iconReset}"/></span></div></div></div><div class="tbody"><div class="_bg tw2gui_bg_l"></div><div class="_bg tw2gui_bg_r"></div></div><div class="tfoot statics"><div class="row row_foot"></div></div></div>`
		)
		tableHtml.find(".row_head > div").each(function () {
			const headerDiv = jQuery(this)
			const match = headerDiv.attr("class").match(/cell_(\d+|reset)/)
			const cellIdentifier = match ? match[1] : null
			if (cellIdentifier === "reset") {
				headerDiv.click(function () {
					dispatchResetAction("job") // Calls dispatchResetAction
				})
			} else if (cellIdentifier !== null) {
				headerDiv.click(
					(
						colIdx => () =>
							applyTableSorting(colIdx)
					)(Number(cellIdentifier))
				)
			}
		})
		tableHtml.find(".row_head").find("img").css("cursor", "pointer")
		const totalAnalyzerStats = {
			jobs: 0,
			count: 0,
			duration: 0,
			experience: 0,
			wage: 0,
			bond: 0,
			motivation: 0,
			injury: 0,
			killed: 0,
			products: 0,
			items: 0,
			luck: 0,
		}
		const jobStatistics = statisticData.job
		uiState.tableRows = []
		for (const jobId in jobStatistics) {
			const jobDetails = Jobs.getJobById(jobId)
			if (!jobDetails) continue
			const jobAggregateStats = {
				count: 0,
				duration: 0,
				experience: 0,
				wage: 0,
				bond: 0,
				motivation: 0,
				injury: 0,
				killed: 0,
				products: 0,
				items: 0,
				luck: 0,
				all_products: {},
				all_items: {},
			}
			const currentJobStats = jobStatistics[jobId]
			jobAggregateStats.count = currentJobStats.count
			// Calculate potential product yield chance
			let totalYieldChance = 0
			if (Array.isArray(jobDetails.randomyields)) {
				for (let i = 0; i < jobDetails.randomyields.length; i++) {
					totalYieldChance += jobDetails.randomyields[i]
				}
			}
			if (typeof jobDetails.yields === "object" && jobDetails.yields !== null) {
				for (const yieldKey in jobDetails.yields) {
					totalYieldChance += jobDetails.yields[yieldKey].prop
				}
			}
			// Aggregate product data
			for (const productId in currentJobStats.products) {
				if (productId === "last") continue
				for (const countKey in currentJobStats.products[productId]) {
					const count = Number(currentJobStats.products[productId][countKey])
					jobAggregateStats.products += count
					const item = ItemManager.get(productId)
					if (item) {
						jobAggregateStats.luck += Number(item.price * count)
					}
					jobAggregateStats.all_products[productId] =
						(jobAggregateStats.all_products[productId] || 0) + count
				}
			}
			// Aggregate motivation-specific data
			for (const motivationKey in currentJobStats) {
				if (motivationKey === "count" || motivationKey === "products") continue
				const motivationStats = currentJobStats[motivationKey]
				jobAggregateStats.motivation += Number(motivationKey) * motivationStats.count
				jobAggregateStats.bond += motivationStats.bond
				jobAggregateStats.duration += motivationStats.duration || 0
				jobAggregateStats.experience += motivationStats.experience
				for (const injuryVal in motivationStats.injury) {
					jobAggregateStats.injury += Number(injuryVal) * motivationStats.injury[injuryVal]
				}
				for (const itemId in motivationStats.items) {
					const count = Number(motivationStats.items[itemId])
					jobAggregateStats.items += count
					const item = ItemManager.get(itemId)
					if (item) {
						jobAggregateStats.luck += Number(item.price * count)
					}
					jobAggregateStats.all_items[itemId] = (jobAggregateStats.all_items[itemId] || 0) + count
				}
				jobAggregateStats.killed += motivationStats.killed
				jobAggregateStats.wage += motivationStats.wage
			}
			// Create HTML row for this job
			const rowElement = jQuery(`<div class="row row_${jobId}" />`)
			const rowCellsData = [
				{
					classes: "cell_0 view-rewards view-items",
					style: "width:91px; text-align:left;cursor:pointer;font-size:11px;",
					sum: jobDetails.name,
					sumT: jobDetails.name,
					avg: jobDetails.name,
					avgT: jobDetails.name,
				},
				{
					classes: "cell_1 view-rewards view-items",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.count,
					sumT: jobAggregateStats.count,
					avg: jobAggregateStats.count,
					avgT: jobAggregateStats.count,
				},
				{
					classes: "cell_2 view-rewards view-items",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: round(jobAggregateStats.duration / 3600, 2),
					sumT: `${String(round(jobAggregateStats.duration / 3600, 2))} ${Language._("misc.hours_lowercase")}`,
					avg: round(jobAggregateStats.duration / (3600 * jobAggregateStats.count), 2),
					avgT: `&Oslash; ${String(round(jobAggregateStats.duration / (3600 * jobAggregateStats.count), 2))} ${Language._("misc.hours_lowercase")}`,
				},
				{
					classes: "cell_3 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.experience,
					sumT: String(jobAggregateStats.experience),
					avg: round(jobAggregateStats.experience / jobAggregateStats.count, 2),
					avgT: `&Oslash; ${String(round(jobAggregateStats.experience / jobAggregateStats.count, 2))}`,
				},
				{
					classes: "cell_4 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.wage,
					sumT: `$${String(jobAggregateStats.wage)}`,
					avg: round(jobAggregateStats.wage / jobAggregateStats.count, 2),
					avgT: `&Oslash; $${String(round(jobAggregateStats.wage / jobAggregateStats.count, 2))}`,
				},
				{
					classes: "cell_5 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.bond,
					sumT: String(jobAggregateStats.bond),
					avg: round((jobAggregateStats.bond / jobAggregateStats.count) * 100, 2),
					avgT: `&Oslash; ${String(round((jobAggregateStats.bond / jobAggregateStats.count) * 100, 2))}%`,
				},
				{
					classes: "cell_6 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.motivation,
					sumT: `${String(jobAggregateStats.motivation)}%`,
					avg: round(jobAggregateStats.motivation / jobAggregateStats.count, 2),
					avgT: `&Oslash; ${String(round(jobAggregateStats.motivation / jobAggregateStats.count, 2))}%`,
				},
				{
					classes: "cell_7 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.injury,
					sumT: String(jobAggregateStats.injury),
					avg: round(jobAggregateStats.injury / jobAggregateStats.count, 2),
					avgT: `&Oslash; ${String(round(jobAggregateStats.injury / jobAggregateStats.count, 2))}`,
				},
				{
					classes: "cell_8 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.killed,
					sumT: String(jobAggregateStats.killed),
					avg: round((jobAggregateStats.killed / jobAggregateStats.count) * 100, 2),
					avgT: `&Oslash; ${String(round((jobAggregateStats.killed / jobAggregateStats.count) * 100, 2))}%`,
				},
				// Cell 9 (rewards): Products count
				{
					classes: "cell_9 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.products,
					sumT: String(jobAggregateStats.products),
					avg: round((jobAggregateStats.products / jobAggregateStats.count) * 100, 2),
					avgT: `&Oslash; ${String(round((jobAggregateStats.products / jobAggregateStats.count) * 100, 2))}% [${totalYieldChance * 100}%]`,
				},
				// Cell 9 (items): Product images
				{
					classes: "cell_9 view-items",
					style: "width:63px; text-align:center;cursor:pointer;",
					sum: jQuery
						.map(jobAggregateStats.all_products, (count, id) => {
							const item = ItemManager.get(id)
							if (!item) return null
							return new tw2widget.Item(item).setCount(count).getMainDiv()
						})
						.filter(item => item !== null),
					avg: jQuery
						.map(jobAggregateStats.all_products, (count, id) => {
							const item = ItemManager.get(id)
							if (!item) return null
							return new tw2widget.Item(item).setCount(count).getMainDiv()
						})
						.filter(item => item !== null),
					// sumT and avgT are not directly applicable here as it's content
				},
				// Cell 10 (rewards): Items count
				{
					classes: "cell_10 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.items,
					sumT: String(jobAggregateStats.items),
					avg: round((jobAggregateStats.items / jobAggregateStats.count) * 100, 2),
					avgT: `&Oslash; ${String(round((jobAggregateStats.items / jobAggregateStats.count) * 100, 2))}%`,
				},
				// Cell 10 (items): Item images
				{
					classes: "cell_10 view-items",
					style: "width:390px; text-align:center;cursor:pointer;",
					sum: jQuery
						.map(jobAggregateStats.all_items, (count, id) => {
							const item = ItemManager.get(id)
							if (!item) return null
							return new tw2widget.Item(item).setCount(count).getMainDiv()
						})
						.filter(item => item !== null),
					avg: jQuery
						.map(jobAggregateStats.all_items, (count, id) => {
							const item = ItemManager.get(id)
							if (!item) return null
							return new tw2widget.Item(item).setCount(count).getMainDiv()
						})
						.filter(item => item !== null),
					// sumT and avgT are not directly applicable here as it's content
				},
				// Cell 11: Luck
				{
					classes: "cell_11 view-rewards",
					style: "width:50px; text-align:center;cursor:pointer;",
					sum: jobAggregateStats.luck,
					sumT: `$${String(jobAggregateStats.luck)}`,
					avg: round(jobAggregateStats.luck / jobAggregateStats.count, 2),
					avgT: `&Oslash; $${String(round(jobAggregateStats.luck / jobAggregateStats.count, 2))}`,
				},
			]

			rowCellsData.forEach((cellData, _index) => {
				const cell = jQuery(`<div class="${cellData.classes}" style="${cellData.style}" ></div>`)
				cell.data("sum", cellData.sum)
				cell.data("sum-t", cellData.sumT)
				cell.data("avg", cellData.avg)
				cell.data("avg-t", cellData.avgT)
				if (typeof cellData.sum === "object" && cellData.sum !== null) {
					// For item images, append directly
					cell.append(cellData.sum)
				}
				rowElement.append(cell)
			})
			totalAnalyzerStats.jobs++ // Only incremented once per job, so outside loop for cells
			totalAnalyzerStats.count += jobAggregateStats.count
			totalAnalyzerStats.duration += jobAggregateStats.duration
			totalAnalyzerStats.experience += jobAggregateStats.experience
			totalAnalyzerStats.wage += jobAggregateStats.wage
			totalAnalyzerStats.bond += jobAggregateStats.bond
			totalAnalyzerStats.motivation += jobAggregateStats.motivation
			totalAnalyzerStats.injury += jobAggregateStats.injury
			totalAnalyzerStats.killed += jobAggregateStats.killed
			totalAnalyzerStats.products += jobAggregateStats.products
			totalAnalyzerStats.items += jobAggregateStats.items
			totalAnalyzerStats.luck += jobAggregateStats.luck
			uiState.tableRows.push(rowElement)
			rowElement.click(function () {
				showJobDetailsPopup(jQuery(this).children(".cell_0").html())
			})
		}
		// Set up the body scrollpane
		uiState.tableBodyScrollpane = new west.gui.Scrollpane()
		jQuery(uiState.tableBodyScrollpane.getMainDiv()).css("height", "300px")
		tableHtml.find(".tbody").append(uiState.tableBodyScrollpane.getMainDiv())
		// Populate footer with total/average statistics
		uiState.tableFooter = tableHtml.find(".row_foot")
		const footerCellsData = [
			{
				classes: "cell_0",
				style: "width:71px; text-align:center;",
				sum: totalAnalyzerStats.jobs,
				sumT: `${totalAnalyzerStats.jobs} ${Language._("misc.jobs")}`,
				avg: totalAnalyzerStats.jobs,
				avgT: `${totalAnalyzerStats.jobs} ${Language._("misc.jobs")}`,
			},
			{
				classes: "cell_0 view-rewards view-items",
				style: "width:87px; text-align:center;cursor:pointer;color:#444;",
				sum: "&sum;",
				sumT: Language._("analyzer.table_sum_tooltip"),
				avg: "&Oslash;",
				avgT: Language._("analyzer.table_avg_tooltip"),
				onClick: applyTableDisplayMode,
				onMouseEnter: function () {
					jQuery(this).css("color", "#888")
				},
				onMouseLeave: function () {
					jQuery(this).css("color", "#444")
				},
			},
			{
				classes: "cell_1 view-rewards view-items",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.count,
				sumT: totalAnalyzerStats.count,
				avg: totalAnalyzerStats.count,
				avgT: totalAnalyzerStats.count,
			},
			{
				classes: "cell_2 view-rewards view-items",
				style: "width:50px; text-align:center;",
				sum: round(totalAnalyzerStats.duration / 3600, 2),
				sumT: `${String(round(totalAnalyzerStats.duration / 3600, 2))} ${Language._("misc.hours_lowercase")}`,
				avg: round(totalAnalyzerStats.duration / (3600 * totalAnalyzerStats.count), 2),
				avgT: `&Oslash; ${String(round(totalAnalyzerStats.duration / (3600 * totalAnalyzerStats.count), 2))} ${Language._("misc.hours_lowercase")}`,
			},
			{
				classes: "cell_3 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.experience,
				sumT: String(totalAnalyzerStats.experience),
				avg: round(totalAnalyzerStats.experience / totalAnalyzerStats.count, 2),
				avgT: `&Oslash; ${String(round(totalAnalyzerStats.experience / totalAnalyzerStats.count, 2))}`,
			},
			{
				classes: "cell_4 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.wage,
				sumT: `$${String(totalAnalyzerStats.wage)}`,
				avg: round(totalAnalyzerStats.wage / totalAnalyzerStats.count, 2),
				avgT: `&Oslash; $${String(round(totalAnalyzerStats.wage / totalAnalyzerStats.count, 2))}`,
			},
			// Cell 5: Total Bond
			{
				classes: "cell_5 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.bond,
				sumT: String(totalAnalyzerStats.bond),
				avg: round((totalAnalyzerStats.bond / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.bond / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 6: Total Motivation
			{
				classes: "cell_6 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.motivation,
				sumT: `${String(totalAnalyzerStats.motivation)}%`,
				avg: round(totalAnalyzerStats.motivation / totalAnalyzerStats.count, 2),
				avgT: `&Oslash; ${String(round(totalAnalyzerStats.motivation / totalAnalyzerStats.count, 2))}%`,
			},
			// Cell 7: Total Injury
			{
				classes: "cell_7 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.injury,
				sumT: String(totalAnalyzerStats.injury),
				avg: round(totalAnalyzerStats.injury / totalAnalyzerStats.count, 2),
				avgT: `&Oslash; ${String(round(totalAnalyzerStats.injury / totalAnalyzerStats.count, 2))}`,
			},
			// Cell 8: Total Killed
			{
				classes: "cell_8 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.killed,
				sumT: String(totalAnalyzerStats.killed),
				avg: round((totalAnalyzerStats.killed / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.killed / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 9 (rewards): Total Products Count
			{
				classes: "cell_9 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.products,
				sumT: String(totalAnalyzerStats.products),
				avg: round((totalAnalyzerStats.products / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.products / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 9 (items): Total Products placeholder (same data as above)
			{
				classes: "cell_9 view-items",
				style: "width:63px; text-align:center;",
				sum: totalAnalyzerStats.products,
				sumT: String(totalAnalyzerStats.products),
				avg: round((totalAnalyzerStats.products / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.products / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 10 (rewards): Total Items Count
			{
				classes: "cell_10 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.items,
				sumT: String(totalAnalyzerStats.items),
				avg: round((totalAnalyzerStats.items / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.items / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 10 (items): Total Items placeholder (same data as above)
			{
				classes: "cell_10 view-items",
				style: "width:390px; text-align:center;",
				sum: totalAnalyzerStats.items,
				sumT: String(totalAnalyzerStats.items),
				avg: round((totalAnalyzerStats.items / totalAnalyzerStats.count) * 100, 2),
				avgT: `&Oslash; ${String(round((totalAnalyzerStats.items / totalAnalyzerStats.count) * 100, 2))}%`,
			},
			// Cell 11: Total Luck
			{
				classes: "cell_11 view-rewards",
				style: "width:50px; text-align:center;",
				sum: totalAnalyzerStats.luck,
				sumT: `$${String(totalAnalyzerStats.luck)}`,
				avg: round(totalAnalyzerStats.luck / totalAnalyzerStats.count, 2),
				avgT: `&Oslash; $${String(round(totalAnalyzerStats.luck / totalAnalyzerStats.count, 2))}`,
			},
		]
		footerCellsData.forEach(cellData => {
			const cell = jQuery(`<div class="${cellData.classes}" style="${cellData.style}" ></div>`)
			cell.data("sum", cellData.sum)
			cell.data("sum-t", cellData.sumT)
			cell.data("avg", cellData.avg)
			cell.data("avg-t", cellData.avgT)
			if (cellData.onClick) {
				cell.click(cellData.onClick)
			}
			if (cellData.onMouseEnter) {
				cell.on("mouseenter", cellData.onMouseEnter)
			}
			if (cellData.onMouseLeave) {
				cell.on("mouseleave", cellData.onMouseLeave)
			}
			uiState.tableFooter.append(cell)
		})
		const controlsAndTableWrapper = jQuery('<div style="margin: 0px 6px 0px 6px;width:680px;" />')
			.append(
				jQuery(`<a href="#">${Language._("analyzer.toggle_rewards_items")}</a>`)
					.css({ marginTop: "-8px", display: "block", textAlign: "center" })
					.click(function () {
						jQuery(".messages-analyzer-job").toggleClass("view-rewards view-items")
					})
			)
			.append(tableHtml)
		return controlsAndTableWrapper
	}
	// Duel analyzer UI is not implemented (placeholder).
	const renderDuelAnalyzerTable = function () {
		return jQuery("<div/>").text(Language._("analyzer.duel_coming_soon"))
	}
	// Job details popup is not implemented (placeholder).
	const showJobDetailsPopup = function (_jobName) {}
	// Chest analyzer: aggregate chest drops into stats and render the UI.
	const ChestAnalyzerModule = (function (jQuery) {
		const api = {}
		api.add = function (event, data) {
			let chestHandled = false
			for (let i = 0; i < data.msg.effects.length; i += 1) {
				const effect = data.msg.effects[i]
				if (effect.type === "lottery" || effect.type === "content") {
					if (!isDefined(statisticData.chest[event.item_id])) {
						statisticData.chest[event.item_id] = { count: 0, items: {} }
					}
					const chestStats = statisticData.chest[event.item_id]
					// Count each opened chest once, even if multiple effects fire.
					if (!chestHandled) {
						chestStats.count++
						chestHandled = true
					}
					effect.items.each(function (item) {
						if (!isDefined(chestStats.items[item.item_id])) {
							chestStats.items[item.item_id] = 0
						}
						chestStats.items[item.item_id] += item.count
					})
				} else if (effect.type === "learn_recipe") {
					TWDB.ClothCalc.recipes[effect.recipe] = 1
				}
			}
			Cache.save("statistic", statisticData)
		}
		api.show = function () {
			if (!MessagesWindow.window) return
			const chestAnalyzerWindow = jQuery(MessagesWindow.window.getContentPane()).find(
				".messages-analyzer-chest"
			)
			MessagesWindow.window.showLoader()
			chestAnalyzerWindow.children().remove()
			const scrollpane = new west.gui.Scrollpane()
			jQuery(scrollpane.getMainDiv()).css("height", "385px")
			chestAnalyzerWindow.append(scrollpane.getMainDiv())
			for (const chestId in statisticData.chest) {
				const chestStats = statisticData.chest[chestId]
				const chestItem = ItemManager.get(chestId)
				if (!chestItem) continue
				const chestItemWidget = new tw2widget.Item(chestItem, "item_inventory").setCount(
					chestStats.count
				)
				chestItemWidget.getImgEl().addClass("item_inventory_img")
				scrollpane.appendContent(
					jQuery('<div style="float:left;position:relative;height:61px;width:61px;" />').append(
						chestItemWidget.getMainDiv()
					)
				)
				let itemsCount = 0
				const itemsContainer = jQuery('<div style="float:left;position:relative;width:610px;" />')
				for (const itemId in chestStats.items) {
					const item = ItemManager.get(itemId)
					if (!item) continue
					itemsCount++
					const itemWidget = new tw2widget.Item(item, "item_inventory").setCount(
						chestStats.items[itemId]
					)
					itemWidget.getImgEl().addClass("item_inventory_img")
					itemsContainer.append(itemWidget.getMainDiv())
				}
				const dividerHeight = String(Math.ceil(itemsCount / 10) * 61)
				scrollpane
					.appendContent(
						`<div style="float:left;position:relative;width:10px;height:${dividerHeight}px;background: url(/images/window/report/devider_report.png) repeat-y;" />`
					)
					.appendContent(itemsContainer)
					.appendContent(
						'<div style="clear:both;position:relative;height:10px;display:block;background: url(/images/window/dailyactivity/wood_devider_horiz.png) repeat-x;" />'
					)
			}
			MessagesWindow.window.hideLoader()
		}
		return api
	})(jQuery)
	// Analyzer init: load/migrate stats, register tabs, wire chest hooks.
	const initializeAnalyzer = function () {
		if (analyzerLoaderConfig.ready) return
		TWDB.Util.addCss(
			`.messages-analyzer-job .item img.tw_item{width:30px;height:27px}.messages-analyzer-job .item .count{bottom:-4px}.messages-analyzer-job .item span.usable{display:none}div.tw2gui_window .messages-analyzer-job div.fancytable .row>div{display:none;vertical-align:top}.messages-analyzer-job.view-rewards div.fancytable .row>div.view-rewards{display:inline-block}.messages-analyzer-job.view-items div.fancytable .row>div.view-items{display:inline-block}div.tw2gui_window .messages-analyzer-job div.fancytable div.trows div.tbody div.row{height:auto}`
		)
		const loadedStats = Cache.load("statistic")
		if (typeof loadedStats === "object" && loadedStats !== null) {
			statisticData = loadedStats
		} else {
			dispatchResetAction("all", true) // Calls dispatcher
		}
		if (!statisticData || !statisticData.ver) {
			dispatchResetAction("all", true) // Calls dispatcher
		}
		switch (statisticData.ver) {
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: <testing>
			case 1: {
				dispatchResetAction("job", true, 1)
				dispatchResetAction("duel", true, 1)
				statisticData.ver = 2
			}
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: <testing>
			case 2: {
				dispatchResetAction("job", true, 1)
				dispatchResetAction("duel", true, 1)
				statisticData.ver = 3
			}
			case 3:
				{
					dispatchResetAction("chest", true, 1)
					statisticData.ver = 4
				}
				break
		}
		initialStatisticSnapshot = jQuery.extend(true, {}, statisticData)
		GameInject.addTabOnMessagesWindow(
			Language._("analyzer.job_title"),
			"analyzer-job",
			function () {
				displayAnalyzerTab("job")
			}
		)
		if (Settings.get("chest_analyzer", true)) {
			GameInject.ItemUse(ChestAnalyzerModule.add)
			GameInject.addTabOnMessagesWindow(
				Language._("analyzer.chest_title"),
				"analyzer-chest",
				ChestAnalyzerModule.show
			)
		}
		analyzerLoaderConfig.ready = true
	}
	analyzerLoaderConfig = Loader.add("Analyzer", "tw-db Job-Analyzer", initializeAnalyzer, {
		Cache: true,
		Settings: true,
		Jobs: true,
	})
	publicApi.restore = function () {
		statisticData = jQuery.extend(true, {}, initialStatisticSnapshot)
		Cache.save("statistic", statisticData)
		const activeTab = MessagesWindow.getActiveTab()
		if (activeTab?.startsWith("analyzer-")) {
			const type = activeTab.split("-")[1]
			displayAnalyzerTab(type, true)
		}
	}
	publicApi.debug = function () {
		console.log(Language._("debug.current_statistic_data"), statisticData)
		console.log(Language._("debug.current_sort_display_state"), sortAndDisplayState)
		console.log(Language._("debug.report_queue"), reportFetchQueue)
		console.log(Language._("debug.failed_report_ids"), failedReportIds)
	}
	publicApi.getExtra = function () {
		return isDefined(statisticData.extra) ? statisticData.extra : null
	}
	return publicApi
})(jQuery)
Debugger.Analyzer = Analyzer


const Notes = (function (e) {
	const notesApi = {}
	let notesContainer = null
	let readyState = {}
	const initializeNotesModule = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("notes", true)) {
				GameInject.addTabOnMessagesWindow(Language._("misc.notes_title"), "notes", function () {
					renderNotesTab()
				})
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.notes_initialize"))
		}
	}
	readyState = Loader.add("Notes", "tw-db Notes", initializeNotesModule, {
		Cache: true,
		Settings: true,
	})
	const renderNotesTab = function () {
		try {
			if (!w.MessagesWindow.window) {
				return
			}
			notesContainer = e(w.MessagesWindow.window.getContentPane()).find(".messages-notes")
			notesContainer
				.css("width", "680px")
				.css("margin", "0 auto")
				.css("position", "relative")
				.css("top", "0")
			displayNotes(Cache.load("notes"))
		} catch (error) {
			ErrorModule.report(error, Language._("errors.notes_render_tab"))
		}
	}
	const saveNotes = function (notesContent) {
		try {
			Cache.save("notes", notesContent)
			new UserMessage(Language._("common.save_success"), UserMessage.TYPE_SUCCESS).show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.notes_save"))
		}
	}
	const editNotes = function (notesContent) {
		try {
			notesContainer.children().remove()
			w.MessagesWindow.window.showLoader()
			const textarea = new west.gui.Textarea().setWidth(660).setHeight(300).setContent(notesContent)
			notesContainer
				.append(
					e('<div style="margin-left:8px" />').append(new west.gui.Bbcodes(textarea).getMainDiv())
				)
				.append(textarea.getMainDiv())
				.append(
					e('<div style="margin-left:8px" />')
						.append(
							new west.gui.Button(Language._("common.save").escapeHTML(), function () {
								saveNotes(textarea.getContent())
								displayNotes(textarea.getContent())
							}).getMainDiv()
						)
						.append(
							new west.gui.Button(Language._("common.preview").escapeHTML(), function () {
								displayNotes(textarea.getContent())
							}).getMainDiv()
						)
				)
			w.MessagesWindow.window.hideLoader()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.notes_edit"))
		}
	}
	const displayNotes = function (notesContent) {
		try {
			notesContainer.children().remove()
			const scrollPane = new west.gui.Scrollpane()
			e(scrollPane.getMainDiv()).css("height", "324px")
			e(scrollPane.getMainDiv())
				.find(".tw2gui_scrollpane_clipper_contentpane")
				.addClass("selectable")
			notesContainer.append(e('<div style="margin:8px" />').append(scrollPane.getMainDiv())).append(
				e('<div style="margin-left:8px" />')
					.append(
						new west.gui.Button(Language._("common.save").escapeHTML(), function () {
							saveNotes(notesContent)
						}).getMainDiv()
					)
					.append(
						new west.gui.Button(Language._("common.edit").escapeHTML(), function () {
							editNotes(notesContent)
						}).getMainDiv()
					)
			)
			if (notesContent) {
				w.MessagesWindow.window.showLoader()
				Ajax.remoteCall("settings", "get_parsed_text", { text: notesContent }, function (response) {
					scrollPane.appendContent(w.Game.TextHandler.parse(response.parsed_text))
					w.MessagesWindow.window.hideLoader()
				})
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.notes_display"))
		}
	}
	return notesApi
})($)
Debugger.Notes = Notes


const MapModule = (function (e) {
	const mapApi = {}
	const _n = false
	const maxX = 181
	const maxY = 79
	let currentX = 0
	let currentY = 0
	let jobGroups = {}
	const _a = {}
	let jobSearchInterval = null
	let jobSearchTimeout = null
	let readyState = {}
	const initializeMapModule = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("coordinates_input", true)) {
				initializeCoordinatesInput()
			}
			Ajax.get("map", "get_minimap", {}, function (response) {
				if (response.error) {
					readyState.failed = true
					return new UserMessage(response.msg).show()
				}
				jobGroups = response.job_groups
				readyState.ready = true
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.map_initialize"))
		}
	}
	readyState = Loader.add("Map", "tw-db Map", initializeMapModule, { Settings: true })
	mapApi.getNearestJob = function (jobId) {
		try {
			const job = JobList.getJobById(jobId)
			const jobLocations = jobGroups[job.groupid]
			if (!jobLocations) {
				return []
			}
			const nearestJobs = []
			const lastPosition = mapApi.getLastPosition()
			for (let index = 0; index < jobLocations.length; index++) {
				const deltaX = jobLocations[index][0] - lastPosition.x
				const deltaY = jobLocations[index][1] - lastPosition.y
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
				const travelTime = window.GameMap.calcWayTime(
					{ x: jobLocations[index][0], y: jobLocations[index][1] },
					lastPosition
				)
				let angle = round((Math.atan(deltaY / deltaX) * 180) / Math.PI)
				if (deltaX < 0) {
					angle -= 180
				}
				nearestJobs.push({
					dist: distance,
					time: travelTime,
					x: jobLocations[index][0],
					y: jobLocations[index][1],
					angle: angle,
				})
			}
			const compareJobDistances = function (job1, job2) {
				return job1.dist * 1 > job2.dist * 1 ? 1 : -1
			}
			nearestJobs.sort(compareJobDistances)
			return nearestJobs
		} catch (error) {
			ErrorModule.report(error, Language._("errors.map_get_nearest_job"))
			return []
		}
	}
	mapApi.getLastPosition = function () {
		const position = { x: Character.position.x, y: Character.position.y }
		const taskQueue = TaskQueue.queue
		for (let index = 0; index < taskQueue.length; index++) {
			const wayData = taskQueue[index].wayData
			if (wayData.x) {
				position.x = wayData.x
				position.y = wayData.y
			}
		}
		return position
	}
	mapApi.setMinimapJob = function (jobName) {
		try {
			if (jobSearchInterval) {
				window.clearInterval(jobSearchTimeout)
				window.clearInterval(jobSearchInterval)
			}
			const setMinimapJobSearch = function (searchName) {
				if (!MinimapWindow.window) {
					return
				}
				const $jobSearch = e(MinimapWindow.window.divMain).find(".tw2gui_jobsearch_string")
				if ($jobSearch.length === 0 || !$jobSearch.is(":visible")) {
					return
				}
				window.clearInterval(jobSearchInterval)
				window.clearInterval(jobSearchTimeout)
				jobSearchInterval = null
				jobSearchTimeout = null
				MinimapWindow.resetSearchContext()
				e("input.tw2gui_jobsearch_string", MinimapWindow.DOM).val(searchName).keyup()
			}
			jobSearchTimeout = setInterval(function () {
				window.clearInterval(jobSearchInterval)
				window.clearInterval(jobSearchTimeout)
				jobSearchInterval = null
				jobSearchTimeout = null
			}, 3e5)
			jobSearchInterval = setInterval(function () {
				setMinimapJobSearch(jobName)
			}, 200)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.map_set_minimap_job"))
		}
	}
	const scanMapCoordinates = function (_e) {
		try {
			let hasMore = false
			let coordinateCount = 0
			const coordinates = []
			for (let x = currentX; x <= maxX; x++) {
				for (let y = currentY; y <= maxY; y++) {
					coordinateCount++
					coordinates.push([x, y])
					if (coordinateCount > 299) {
						hasMore = true
						break
					}
				}
				if (hasMore) {
					break
				}
				currentY = 0
			}
			currentX = x
			currentY = y + 1
			if (coordinates.length > 0) {
				window.GameMap.Data.Loader.load(coordinates, function () {
					setTimeout(function () {
						mapApi.loadMap()
					}, Timer.getTimeout())
				})
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.map_scan_coordinates"))
		}
	}
	mapApi.loadMap = function () {
		scanMapCoordinates()
	}
	const initializeCoordinatesInput = function () {
		try {
			TWDB.Util.addCss(
				`div#mmap_twdb_coords{position:absolute;bottom:35px;left:1px;display:block}div#mmap_twdb_coords>img{cursor:pointer;opacity:0.5;position:relative}`,
				"minimap"
			)
			const createCoordinatesInput = function () {
				const coordsContainer = e('<div id="mmap_twdb_coords" />')
				const xField = new west.gui.Textfield()
				const yField = new west.gui.Textfield()
				let lastXValue = ""
				let lastYValue = ""
				xField.setWidth(45)
				yField.setWidth(45).setMaxLength(5)
				const centerOnCoordinates = function () {
					const xCoord = Number(xField.getValue())
					const yCoord = Number(yField.getValue())
					window.GameMap.center(xCoord, yCoord)
					xField.setValue("")
					yField.setValue("")
				}
				e(xField.getMainDiv())
					.find("input")
					.keyup(function (keyEvent) {
						window.setTimeout(function () {
							let matchResult
							if (keyEvent.ctrlKey && keyEvent.keyCode === 86 && !keyEvent.altKey) {
								matchResult = /^([0-9]{1,5})([^0-9]+)([0-9]{1,5})$/.exec(e.trim(xField.getValue()))
								if (matchResult) {
									xField.setValue(matchResult[1])
									yField.setValue(matchResult[3])
									e(yField.getMainDiv()).find("input").focus()
									lastXValue = xField.getValue()
									lastYValue = yField.getValue()
									return
								}
								matchResult = /^([0-9]{1,5})$/.exec(e.trim(xField.getValue()))
								if (matchResult) {
									xField.setValue(matchResult[1])
									e(yField.getMainDiv()).find("input").focus()
									lastXValue = xField.getValue()
									return
								}
								xField.setValue(lastXValue)
							}
							if (keyEvent.keyCode === 13) {
								return centerOnCoordinates()
							}
							if (String(e.trim(xField.getValue())).length === 0) {
								lastXValue = xField.getValue()
								return
							}
							matchResult = /^([0-9]{1,5})$/.exec(e.trim(xField.getValue()))
							if (matchResult) {
								xField.setValue(matchResult[1])
								if (String(matchResult[1]).length === 5) {
									e(yField.getMainDiv()).find("input").focus()
								}
								lastXValue = xField.getValue()
								return
							}
							xField.setValue(lastXValue)
						}, 100)
					})
				e(yField.getMainDiv())
					.find("input")
					.keyup(function (keyEvent) {
						window.setTimeout(function () {
							if (keyEvent.ctrlKey && keyEvent.keyCode === 86 && !keyEvent.altKey) {
								const matchResult = /^([0-9]{1,5})$/.exec(e.trim(yField.getValue()))
								if (matchResult) {
									yField.setValue(matchResult[1])
									e(yField.getMainDiv()).find("input").focus()
									lastYValue = yField.getValue()
									return
								}
								yField.setValue(lastYValue)
							}
							if (keyEvent.keyCode === 13) {
								centerOnCoordinates()
								return
							}
							if (String(e.trim(yField.getValue())).length === 0) {
								lastYValue = yField.getValue()
								return
							}
							const matchResult2 = /^([0-9]{1,5})$/.exec(e.trim(yField.getValue()))
							if (matchResult2) {
								yField.setValue(matchResult2[1])
								if (String(matchResult2[1]).length === 5) {
									e(yField.getMainDiv()).find("input").focus()
								}
								lastYValue = yField.getValue()
								return
							}
							yField.setValue(lastYValue)
						}, 100)
					})
				const okButton = new west.gui.Button(
					Language._("common.ok"),
					function () {
						centerOnCoordinates()
					},
					null,
					null,
					Language._("map.coordinates_button")
				).setWidth("48")
				const coordsToggle = e(
					`<img title="${Language._("map.coordinates_tooltip")}" src="${Images.iconCount}" />`
				).click(function () {
					if (e(this).css("opacity") === 1) {
						e(this).css("opacity", "0.5")
						window.GameMap.hideCoords()
					} else {
						e(this).css("opacity", "1")
						window.GameMap.showCoords()
					}
				})
				coordsContainer.append(
					coordsToggle,
					xField.getMainDiv(),
					"<span>|</span>",
					yField.getMainDiv(),
					e(okButton.getMainDiv()).css("top", "6px")
				)
				e(".minimap-right", MinimapWindow.window.divMain).append(coordsContainer)
			}
			GameInject.injectMinimap(function () {
				createCoordinatesInput()
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.map_initialize_coordinates"))
		}
	}
	return mapApi
})($)
_base.Map = MapModule
Debugger.Map = MapModule


const BonusJobs = (function (e) {
	const bonusJobsApi = {}
	let bonusJobsData
	let readyState = {}
	let displaySettings = { gold: false, silver: false }
	initializeBonusJobs = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (!Settings.get("bonus_jobs", true)) {
				readyState.ready = true
				return
			}
			let locationKey
			let locationData
			let validJobCount
			let jobKey
			const serverDate = get_server_date()
			const resetHour = 1
			const resetTime = new Date()
			resetTime.setUTCHours(resetHour)
			resetTime.setMinutes(15)
			resetTime.setSeconds(0)
			resetTime.setMilliseconds(0)
			let cutoffTime = resetTime.getTime()
			if (
				serverDate.getUTCHours() < resetHour ||
				(serverDate.getUTCHours() === resetHour && serverDate.getMinutes() < 15)
			)
				cutoffTime -= 24 * 60 * 60 * 1e3
			bonusJobsData = Cache.load("bonusjobs") || {}
			displaySettings = Cache.load("bonusdisplay") || { gold: false, silver: false }
			for (locationKey in bonusJobsData) {
				if (!Object.hasOwn(bonusJobsData, locationKey)) {
					continue
				}
				locationData = bonusJobsData[locationKey]
				validJobCount = 0
				for (jobKey in locationData) {
					if (!Object.hasOwn(locationData, jobKey)) {
						continue
					}
					if (locationData[jobKey].gold) {
						validJobCount++
						continue
					}
					if (locationData[jobKey].time > cutoffTime) {
						validJobCount++
					} else {
						delete locationData[jobKey]
					}
				}
				if (validJobCount === 0) {
					delete bonusJobsData[locationKey]
				}
			}
			renderBonusJobMarkers()
			processJobData()
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_initialize"))
		}
	}
	readyState = Loader.add("BonusJobs", "tw-db BonusJobs", initializeBonusJobs, {
		Settings: true,
		Cache: true,
		Jobs: true,
	})
	const processJobData = function () {
		try {
			const handleRadialMenuClick = function (menuEvent) {
				const position = window.GameMap.Helper.getPosition(menuEvent.parent)
				if (!isDefined(position) || !isDefined(position.x) || !isDefined(position.y)) {
					return
				}
				if (!isDefined(window.GameMap.JobHandler.Featured[`${position.x}-${position.y}`])) {
					if (isDefined(bonusJobsData[`${position.x}-${position.y}`])) {
						delete bonusJobsData[`${position.x}-${position.y}`]
						Cache.save("bonusjobs", bonusJobsData)
					}
					return
				}
				const featuredJobs = window.GameMap.JobHandler.Featured[`${position.x}-${position.y}`]
				let jobId
				bonusJobsData[`${position.x}-${position.y}`] = {}
				for (jobId in featuredJobs) {
					if (!Object.hasOwn(featuredJobs, jobId)) {
						continue
					}
					bonusJobsData[`${position.x}-${position.y}`][jobId] = featuredJobs[jobId]
					bonusJobsData[`${position.x}-${position.y}`][jobId].time = Date.now()
				}
				Cache.save("bonusjobs", bonusJobsData)
			}
			GameInject.injectRadialmenu(function (menuEvent) {
				handleRadialMenuClick(menuEvent)
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_process_data"))
		}
	}
	const renderBonusJobMarkers = function () {
		try {
			TWDB.Util.addCss(
				`div#mmap_twdb_bonusjobs{position:absolute;top:40px;right:10px}div#mmap_twdb_bonusjobs>input[type="checkbox"]{margin-left:6px;cursor:pointer}div#mmap_twdb_bonusjobs>div{position:relative;display:inline-block;height:9px;width:9px;margin:1px}div#mmap_twdb_bonusjobs>img{margin-left:3px;cursor:pointer;position:relative;display:inline-block;height:16px;width:16px;top:-4px}`,
				"minimap"
			)
			const updateMinimapMarkers = function () {
				const container = e('<div id="mmap_twdb_bonusjobs" />')
					.append(
						e(
							`<input title="${Language._("jobs.show_gold_jobs")}" type="checkbox" ${displaySettings.gold ? 'checked="checked"' : ""} />`
						).change(function () {
							displaySettings.gold = e(this).is(":checked")
							saveBonusDisplaySettings()
						})
					)
					.append(
						`<div title="${Language._("jobs.gold_jobs")}" style="background-color:yellow; border:1px solid red;" />`
					)
					.append(
						e(
							`<input title="${Language._("jobs.show_silver_jobs")}" type="checkbox" ${displaySettings.silver ? 'checked="checked"' : ""}" />`
						).change(function () {
							displaySettings.silver = e(this).is(":checked")
							saveBonusDisplaySettings()
						})
					)
					.append(
						`<div title="${Language._("jobs.silver_jobs")}" style="background-color:white; border:1px solid black;" />`
					)
					.append(
						e(
							`<img title="${Language._("misc.export")} - ${Language._("jobs.with_bonus")}" src="${Images.iconExport}" />`
						).click(function () {
							exportBonusJobs()
						})
					)
					.append(
						e(
							`<img title="${Language._("misc.import")} - ${Language._("jobs.with_bonus")}" src="${Images.iconImport}" />`
						).click(function () {
							importBonusJobs()
						})
					)
					.append(
						e(
							`<img title="${Language._("misc.reset")} - ${Language._("jobs.with_bonus")}" src="${Images.iconReset2}" />`
						).click(function () {
							resetBonusJobFilters()
						})
					)
				e(MinimapWindow.window.divMain).find(".minimap-right").append(container)
				saveBonusDisplaySettings()
			}
			GameInject.injectMinimap(function () {
				updateMinimapMarkers()
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_render_markers"))
		}
	}
	const saveBonusDisplaySettings = function () {
		try {
			Cache.save("bonusdisplay", displaySettings)
			e("#minimap_worldmap > div.TWDBbonusjob", MinimapWindow.window.divMain).remove()
			const createBonusJobMarker = function (xCoord, yCoord, isGold, jobCount, popupContent) {
				const scaleFactor = 0.00513
				const markerX = parseInt(xCoord * scaleFactor, 10) - 3
				const markerY = parseInt(yCoord * scaleFactor, 10) + 2
				let rotationStyle = ""
				if (jobCount > 1) {
					rotationStyle =
						"-moz-transform:rotate(45deg);-webkit-transform:rotate(45deg);-o-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg);"
				}
				const marker = e(
					`<div class="TWDBbonusjob" style="z-index:7;position:absolute;display:block;width:4px;height:4px;background-color:${isGold ? "yellow" : "white"};left:${markerX}px;top:${markerY}px;${rotationStyle}border:1px solid ${isGold ? "red" : "black"};" />`
				)
					.click(
						(function (x, y) {
							return function () {
								window.GameMap.center(x, y)
							}
						})(xCoord, yCoord)
					)
					.addMousePopup(
						`<div style="min-width:60px;text-align:center">${popupContent.join('<div class="marker_popup_divider"></div>')}</div>`
					)
				e(MinimapWindow.window.divMain).find("#minimap_worldmap").append(marker)
			}
			const locationData = bonusJobsData
			for (const locationKey in locationData) {
				if (!Object.hasOwn(locationData, locationKey)) {
					continue
				}
				const jobsAtLocation = locationData[locationKey]
				let hasGoldJob = false
				let visibleJobCount = 0
				const popupItems = []
				for (const jobId in jobsAtLocation) {
					if (!Object.hasOwn(jobsAtLocation, jobId)) {
						continue
					}
					if (jobsAtLocation[jobId].gold) {
						if (!displaySettings.gold) {
							continue
						}
						hasGoldJob = true
						visibleJobCount++
					}
					if (jobsAtLocation[jobId].silver) {
						if (!displaySettings.silver) {
							continue
						}
						visibleJobCount++
					}
					popupItems.push(
						Jobs.getPopup(
							jobsAtLocation[jobId].job_id,
							jobsAtLocation[jobId].gold ? "gold" : "silver"
						)
					)
				}
				if (visibleJobCount > 0) {
					const firstJob = jobsAtLocation[Object.keys(jobsAtLocation)[0]]
					createBonusJobMarker(firstJob.x, firstJob.y, hasGoldJob, visibleJobCount, popupItems)
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_save_display_settings"))
		}
	}
	const exportBonusJobs = function () {
		try {
			const jobList = []
			for (const locationKey in bonusJobsData) {
				if (!Object.hasOwn(bonusJobsData, locationKey)) {
					continue
				}
				const jobsAtLocation = bonusJobsData[locationKey]
				for (const jobId in jobsAtLocation) {
					if (!Object.hasOwn(jobsAtLocation, jobId)) {
						continue
					}
					const job = Jobs.getJobById(jobId)
					const country =
						Math.ceil(jobsAtLocation[jobId].x / 6635) + (jobsAtLocation[jobId].y > 10176 ? 7 : 0)
					jobList.push({
						name: job.name,
						bonus: jobsAtLocation[jobId].gold ? "gold" : "silver",
						country: country,
						x: jobsAtLocation[jobId].x,
						y: jobsAtLocation[jobId].y,
						id: jobId,
					})
				}
			}
			const textarea = e("<textarea />")
				.css({
					width: "500px",
					height: "200px",
					"background-color": "transparent",
					"border-width": "0px",
				})
				.click(function () {
					this.select()
				})
			let sortField = ""
			let sortDirection = 1
			const sortBonusJobs = function (fieldName) {
				if (sortField !== fieldName) {
					sortField = fieldName
					sortDirection = 1
				} else {
					sortDirection *= -1
				}
				const compareBonusJobFields = function (job1, job2) {
					return job1[sortField] > job2[sortField] ? sortDirection : -1 * sortDirection
				}
				jobList.sort(compareBonusJobFields)
				let exportText = ""
				let currentCountry = ""
				for (let index = 0; index < jobList.length; index++) {
					const job = jobList[index]
					if (sortField === "country" && currentCountry !== job.country) {
						currentCountry = job.country
						exportText += `-- ${Language._("misc.country")} ${currentCountry} -- <br />`
					}
					exportText += `${job.name}; ${job.bonus}; ${job.x}-${job.y}; ${job.id}<br />`
				}
				textarea.val(exportText)
			}
			sortBonusJobs("name")
			const sortButtons = e("<div />")
				.css({
					width: "500px",
					height: "22px",
					position: "relative",
					display: "block",
				})
				.append(
					e(
						`<img src="${Images.iconName}" title="${Language._("misc.sort_by")} ${Language._("misc.name")}" style="margin:0px 2px 0px 2px;cursor:pointer;" /> `
					).click(function () {
						sortBonusJobs("name")
					})
				)
				.append(
					e(
						`<img src="${Images.iconCount}" title="${Language._("misc.sort_by")} ${Language._("misc.country")}" style="margin:0px 2px 0px 2px;cursor:pointer;" /> `
					).click(function () {
						sortBonusJobs("country")
					})
				)
			new west.gui.Dialog(
				`${Language._("misc.export")} - ${Language._("jobs.with_bonus")}`,
				e("<div />").append(sortButtons).append(textarea)
			)
				.addButton(Language._("common.ok"))
				.show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_export"))
		}
	}
	const importBonusJobs = function () {
		try {
			const textarea = e("<textarea />").css({ width: "400px", height: "100px" })
			const parseImportedJobs = function () {
				const importText = textarea.val()
				const importLines = importText.split(/[\n,\r,\r\n]/)
				let lineIndex
				let lineParts
				let coordsParts
				let jobId
				let jobData
				let locationKey
				for (lineIndex = 0; lineIndex < importLines.length; lineIndex++) {
					lineParts = importLines[lineIndex].split(";", 4)
					if (
						lineParts.length !== 4 ||
						!e.isNumeric(lineParts[3]) ||
						!Jobs.getJobById(Number(lineParts[3]))
					) {
						continue
					}
					coordsParts = String(lineParts[2]).split("-", 2)
					if (
						coordsParts.length !== 2 ||
						!e.isNumeric(coordsParts[0]) ||
						!e.isNumeric(coordsParts[1])
					) {
						continue
					}
					jobId = Number(lineParts[3])
					jobData = {
						gold: e.trim(lineParts[1]) === "gold",
						group_id: Jobs.getJobById(jobId).groupid,
						job_id: jobId,
						silver: e.trim(lineParts[1]) !== "gold",
						x: Number(coordsParts[0]),
						y: Number(coordsParts[1]),
						time: Date.now(),
					}
					locationKey = `${Number(coordsParts[0])}-${Number(coordsParts[1])}`
					if (!isDefined(bonusJobsData[locationKey])) {
						bonusJobsData[locationKey] = {}
					}
					bonusJobsData[locationKey][jobId] = jobData
				}
				Cache.save("bonusjobs", bonusJobsData)
				saveBonusDisplaySettings()
			}
			new west.gui.Dialog(
				`${Language._("misc.import")} - ${Language._("jobs.with_bonus")}`,
				textarea
			)
				.addButton(Language._("common.ok"), parseImportedJobs)
				.addButton(Language._("common.cancel"))
				.show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_import"))
		}
	}
	const resetBonusJobFilters = function (filterType) {
		try {
			if (filterType) {
				for (const locationKey in bonusJobsData) {
					if (!Object.hasOwn(bonusJobsData, locationKey)) {
						continue
					}
					const jobsAtLocation = bonusJobsData[locationKey]
					let remainingCount = 0
					for (const jobId in jobsAtLocation) {
						if (!Object.hasOwn(jobsAtLocation, jobId)) {
							continue
						}
						if (filterType === "gold" && jobsAtLocation[jobId].gold) {
							remainingCount++
							continue
						}
						if (filterType === "silver" && jobsAtLocation[jobId].silver) {
							remainingCount++
							continue
						}
						delete jobsAtLocation[jobId]
					}
					if (remainingCount === 0) {
						delete bonusJobsData[locationKey]
					}
				}
				Cache.save("bonusjobs", bonusJobsData)
				saveBonusDisplaySettings()
				new UserMessage(
					`${Language._("misc.reset")} - ${Language._("jobs.with_bonus")}`,
					UserMessage.TYPE_SUCCESS
				).show()
			} else {
				const dialogTitle = `${Language._("misc.reset")} - ${Language._("jobs.with_bonus")}`
				const dialogMessage = `<div class="txcenter">${Language._("jobs.reset_jobs_bonus_confirm")}</div>`
				new west.gui.Dialog(dialogTitle, dialogMessage, west.gui.Dialog.SYS_QUESTION)
					.addButton(Language._("jobs.reset_all_jobs_bonus"), function () {
						resetBonusJobFilters("all")
					})
					.addButton(Language._("jobs.reset_silver_jobs_bonus"), function () {
						resetBonusJobFilters("silver")
					})
					.addButton(Language._("jobs.reset_gold_jobs_bonus"), function () {
						resetBonusJobFilters("gold")
					})
					.addButton(Language._("common.cancel"))
					.show()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bonusjobs_reset"))
		}
	}
	return bonusJobsApi
})($)
Debugger.BonusJobs = BonusJobs


const Chat = (function (e) {
	const chatApi = {}
	const emoticonMap = {
		":/": "sore",
		"=:)": "invader",
		">:(": "angry",
		":'(": "cry",
		":)": "smile",
		":D": "grin",
		":(": "frown",
		";)": "smirk",
		":P": "tongue",
		":o": "ohmy",
		":x": "muted",
		":|": "silent",
		">.<": "palm",
		"-.-": "nc",
		"o.O": "oo",
		"O.o": "oo",
		"^_^": "happy",
		o_O: "oo",
		"x.x": "xx",
		"T.T": "cry",
		"el pollo diablo!": "elpollodiablo",
		"!el pollo diablo": "elpollodiablo_mirror",
		"el pollo diablo?!": "elpollodiablo_front",
		"add me": "sheep.gif",
		"add me!": "sheep_rainbow.gif",
	}
	let chatHistory = []
	let readyState = {}
	const initializeChatEnhancement = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("chat", true)) {
				GameInject.ChatLayout(function (chatTab) {
					processChatLayout(chatTab)
				})
				GameInject.ChatSend(function (chatTab) {
					processChatSend(chatTab)
				})
				let cachedHistory = Cache.load("chathistory")
				if (typeof cachedHistory === "object" && cachedHistory !== null) {
					if (cachedHistory.color) {
						cachedHistory = cachedHistory.color
						Cache.save("chathistory", cachedHistory)
					}
					chatHistory = cachedHistory
				}
				if (
					$("div.tw2gui_window.chat.nominimize div.tw2gui_window_buttons_close").click().length > 0
				) {
					ChatWindow.open()
				}
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_initialize"))
		}
	}
	readyState = Loader.add("Chat", "tw-db Chat Enhancement", initializeChatEnhancement, {
		Settings: true,
		Cache: true,
	})
	const processChatSend = function (chatTab) {
		try {
			let inputText = chatTab.input.val()
			if (!inputText) {
				return
			}
			const formatChatText = function (text) {
				if (chatTab._caps) {
					text = text.toUpperCase()
				}
				if (chatTab._bold) {
					text = text.replace(/\*/g, "~")
					text = `*${text}*`
				}
				return text
			}
			if (inputText.substr(0, 1) === "/") {
				const tellPattern = /^\/(tell|msg)\s+([^:]+):(.+)$/
				const tellMatch = inputText.match(tellPattern)
				if (tellMatch) {
					if (chatTab._color) {
						inputText = `/tell ${tellMatch[2]}:/${chatTab._color}${formatChatText(tellMatch[3])}`
					} else {
						inputText = `/tell ${tellMatch[2]}:${formatChatText(tellMatch[3])}`
					}
				}
				chatTab.input.val(inputText)
				return
			}
			inputText = formatChatText(inputText)
			if (chatTab._color) {
				inputText = `/${chatTab._color}${inputText}`
			}
			chatTab.input.val(inputText)
			return
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_process_send"))
		}
	}
	const processChatLayout = function (chatTab) {
		try {
			const chatContainer = chatTab.mainDiv.find(".TWDBchat")
			if (chatContainer.length === 0) {
				chatTab.mainDiv.find(".chat_input").find(".cbg").css("left", "38px").addClass(".TWDBchat")
				chatTab._color = null
				chatTab._bold = false
				chatTab._caps = false
				renderEmoticonPicker(chatTab)
				renderColorPicker(chatTab)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_process_layout"))
		}
	}
	const renderEmoticonPicker = function (chatTab) {
		try {
			let emoticonImage
			const emoticonContainer = e(
				'<span style="padding:3px;display:none;width:160px;position:absolute;bottom:20px;left:-3px;" />'
			)
			for (const emoticonKey in emoticonMap) {
				emoticonImage =
					emoticonMap[emoticonKey].indexOf(".gif") === -1
						? `${emoticonMap[emoticonKey]}.png`
						: emoticonMap[emoticonKey]
				emoticonContainer.append(
					e(
						`<img src="${Game.cdnURL}/images/chat/emoticons/${emoticonImage}?1" title="${emoticonKey}" style="cursor:pointer;margin:1px;" />`
					).click(
						(function (emoticon) {
							return function () {
								chatTab.input.val(`${chatTab.input.val()} ${emoticon} `)
								chatTab.input.focus()
								emoticonContainer.hide()
							}
						})(emoticonKey)
					)
				)
			}
			let isHovering = false
			chatTab.mainDiv.find(".chat_input").append(
				e(
					'<div style="position:absolute;width:15px;height:15px;bottom:7px;vertical-align:top;left:23px;cursor:pointer;" />'
				)
					.append(e(`<img style="vertical-align:top;" src="${Images.iconChatSM}" />`))
					.append(emoticonContainer)
					.on("mouseenter", function () {
						isHovering = true
						emoticonContainer.show()
					})
					.on("mouseleave", function () {
						isHovering = false
						setTimeout(function () {
							if (!isHovering) {
								emoticonContainer.hide()
							}
						}, 200)
					})
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_render_emoticon_picker"))
		}
	}
	const convertRgbToGameColor = function (rgbString) {
		try {
			const rgbMatch = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
			if (rgbMatch) {
				return (
					String(parseInt((rgbMatch[1] * 9) / 255 + 0.5, 10)) +
					String(parseInt((rgbMatch[2] * 9) / 255 + 0.5, 10)) +
					String(parseInt((rgbMatch[3] * 9) / 255 + 0.5, 10))
				)
			} else {
				return "000"
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_convert_rgb_to_game_color"))
			return "000"
		}
	}
	const convertGameColorToRgb = function (gameColor) {
		try {
			return `rgb(${parseInt((gameColor[0] * 255) / 9, 10)},${parseInt((gameColor[1] * 255) / 9, 10)},${parseInt((gameColor[2] * 255) / 9, 10)})`
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_convert_game_color_to_rgb"))
			return "rgb(0,0,0)"
		}
	}
	const applyChatFormatting = function (chatTab, formatOptions) {
		try {
			if (isDefined(formatOptions.color)) {
				const gameColor = convertRgbToGameColor(formatOptions.color)
				const historyLength = chatHistory.length
				for (let index = 0; index < historyLength; index++) {
					const historyColor = chatHistory.shift()
					if (historyColor !== gameColor) {
						chatHistory.push(historyColor)
					}
				}
				chatHistory.push(gameColor)
				if (chatHistory.length > 5) {
					chatHistory.shift()
				}
				Cache.save("chathistory", chatHistory)
				chatTab._color = gameColor
			}
			if (formatOptions.color === null) {
				chatTab._color = null
			}
			if (isDefined(formatOptions.bold)) {
				chatTab._bold = formatOptions.bold
			}
			if (isDefined(formatOptions.caps)) {
				chatTab._caps = formatOptions.caps
			}
			if (chatTab._bold) {
				chatTab.mainDiv.find(".TWDBtext").css("font-weight", "bold")
			} else {
				chatTab.mainDiv.find(".TWDBtext").css("font-weight", "normal")
			}
			if (chatTab._caps) {
				chatTab.mainDiv.find(".TWDBtext").html("A")
			} else {
				chatTab.mainDiv.find(".TWDBtext").html("a")
			}
			if (chatTab._color) {
				chatTab.mainDiv
					.find(".TWDBcolor")
					.children("div")
					.children("div")
					.css("background-color", convertGameColorToRgb(chatTab._color))
				if (chatTab._color[1] >= 4) {
					chatTab.mainDiv.find(".TWDBtext").css("color", "#000")
				} else {
					chatTab.mainDiv.find(".TWDBtext").css("color", "#fff")
				}
			} else {
				chatTab.mainDiv
					.find(".TWDBcolor")
					.children("div")
					.children("div")
					.css("background-color", "#e0e2e0")
				chatTab.mainDiv.find(".TWDBtext").css("color", "#000")
			}
			chatTab.input.focus()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_apply_formatting"))
		}
	}
	const createColorPickerLayer = function (color) {
		try {
			const container = e(
				'<div style="position:absolute;display:block;width:15px;height:15px;"></div>'
			)
			const layers = [
				{ w: 15, h: 1, t: 7, l: 0, o: 0.1 },
				{ w: 1, h: 15, t: 0, l: 7, o: 0.1 },
				{ w: 15, h: 3, t: 6, l: 0, o: 0.33 },
				{ w: 3, h: 15, t: 0, l: 6, o: 0.33 },
				{ w: 15, h: 5, t: 5, l: 0, o: 0.47 },
				{ w: 5, h: 15, t: 0, l: 5, o: 0.47 },
				{ w: 13, h: 9, t: 3, l: 1, o: 0.6 },
				{ w: 9, h: 13, t: 1, l: 3, o: 0.6 },
				{ w: 11, h: 11, t: 2, l: 2, o: 0.8 },
				{ w: 13, h: 7, t: 4, l: 1 },
				{ w: 7, h: 13, t: 1, l: 4 },
				{ w: 9, h: 11, t: 2, l: 3 },
				{ w: 11, h: 9, t: 3, l: 2 },
			]
			for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
				const layer = layers[layerIndex]
				const style = `position:absolute; width:${layer.w}px; height:${layer.h}px; top:${layer.t}px; left:${layer.l}px; background-color:${color};${layer.o != null ? `opacity:${layer.o};` : ""}`
				container.append(e(`<div style="${style}"></div>`))
			}
			return container
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_create_color_picker_layer"))
			return e()
		}
	}
	const renderColorPicker = function (chatTab) {
		try {
			const COLORS = ["black", "red", "blue", "yellow", "green", "brown", "magenta", "gray"]
			chatTab.format = chatTab.format || {}
			function setActive(el, on) {
				el.css("opacity", on ? 1 : 0.5)
			}
			function makeTextButton(label, key) {
				return e(
					'<div style="display:inline-block;width:15px;height:15px;padding:2px;opacity:0.5;"/>'
				)
					.append(createColorPickerLayer("#e0e2e0"))
					.append(
						e(
							`<div style="position:absolute;width:15px;height:15px;"><table border="0" cellspacing="0" cellpadding="0" style="padding:0;margin:0;border:0;"><tr><td style="display:block;width:15px;height:15px;text-align:center;font-size:11px;color:#000;${key === "bold" ? "font-weight:bold;" : ""}">${label}</td></tr></table></div>`
						)
					)
					.click(function () {
						const next = !chatTab.format[key]
						chatTab.format[key] = next
						applyChatFormatting(chatTab, { [key]: next })
						setActive(e(this), next)
						colorPickerMenu.hide()
					})
			}
			function makeColorButton(color) {
				return e('<div style="display:inline-block;width:15px;height:15px;padding:2px;"/>')
					.append(createColorPickerLayer(color))
					.click(function () {
						applyChatFormatting(chatTab, {
							color: e(this).children("div").children("div").css("background-color"),
						})
						colorPickerMenu.hide()
					})
			}
			const colorPickerMenu = e(
				'<span style="position:absolute;display:none;padding:3px;width:300px;bottom:17px;left:-5px;" />'
			)
			colorPickerMenu.append(
				'<div style="position:absolute;height:50px;width:25px;display:block" />'
			)
			const boldBtn = makeTextButton("a", "bold")
			const capsBtn = makeTextButton("A", "caps")
			colorPickerMenu.append(boldBtn)
			colorPickerMenu.append(capsBtn)
			for (let colorIndex = 0; colorIndex < COLORS.length; colorIndex++) {
				colorPickerMenu.append(makeColorButton(COLORS[colorIndex]))
			}
			colorPickerMenu.append(
				e(
					`<div style="margin:2px;display:inline-block;width:15px;height:15px;background:url(${Images.iconChatNoColor}) no-repeat 0 0 transparent;" />`
				).click(function () {
					applyChatFormatting(chatTab, { color: null })
					chatTab.format.bold = false
					chatTab.format.caps = false
					applyChatFormatting(chatTab, { bold: false, caps: false })
					setActive(boldBtn, false)
					setActive(capsBtn, false)
					colorPickerMenu.hide()
				})
			)
			colorPickerMenu.append(
				e(
					`<div style="margin:3px;display:inline-block;width:13px;height:13px;background:url(${Images.iconChat}) no-repeat 0 0 transparent;" />`
				).click(function () {
					openColorPickerDialog(chatTab)
					colorPickerMenu.hide()
				})
			)
			function syncTextState() {
				setActive(boldBtn, !!chatTab.format.bold)
				setActive(capsBtn, !!chatTab.format.caps)
			}
			let hovering = false
			chatTab.mainDiv.find(".chat_input").append(
				e(
					'<div class="TWDBcolor" style="position:absolute;width:15px;height:15px;bottom:7px;left:5px;cursor:pointer;" />'
				)
					.append(createColorPickerLayer("#e0e2e0"))
					.append(
						e(
							`<div style="position:absolute;width:15px;height:15px;"><table border="0" cellspacing="0" cellpadding="0" style="padding:0;margin:0;border:0;"><tr><td class="TWDBtext" style="display:block;width:15px;height:15px;text-align:center;font-size:11px;color:#000;">a</td></tr></table></div>`
						)
					)
					.append(colorPickerMenu)
					.on("mouseenter", function () {
						hovering = true
						syncTextState()
						colorPickerMenu.show()
					})
					.on("mouseleave", function () {
						hovering = false
						setTimeout(function () {
							if (!hovering) colorPickerMenu.hide()
						}, 200)
					})
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_render_color_picker"))
		}
	}
	const openColorPickerDialog = function (chatTab) {
		try {
			const colorDiv = chatTab.mainDiv.find(".TWDBcolor").children("div").children("div")
			let currentColor = convertRgbToGameColor(colorDiv.css("background-color"))
			const dialogElements = {}
			dialogElements.customColor = e(
				'<div style="width:50px;height:50px;display:inline-block;vertical-align:top;margin: 5px;" />'
			)
			dialogElements.customColor.css(
				"background-color",
				convertGameColorToRgb(convertRgbToGameColor(colorDiv.css("background-color")))
			)
			const adjustColorValue = (colorIndex, increase) => {
				if (
					(increase && currentColor[colorIndex] === 9) ||
					(!increase && currentColor[colorIndex] === 0)
				) {
					return
				}
				const colorArray = [
					Number(currentColor[0]),
					Number(currentColor[1]),
					Number(currentColor[2]),
				]
				colorArray[colorIndex] += increase ? 1 : -1
				currentColor = String(colorArray[0]) + String(colorArray[1]) + String(colorArray[2])
				dialogElements.input.val(currentColor)
				dialogElements.plusminus[colorIndex]
					.children(".butMinus")
					.css("opacity", currentColor[colorIndex] === 0 ? 0.3 : 1)
				dialogElements.plusminus[colorIndex]
					.children(".butPlus")
					.css("opacity", currentColor[colorIndex] === 9 ? 0.3 : 1)
				dialogElements.customColor.css("background-color", convertGameColorToRgb(currentColor))
			}
			const controlsContainer = e(
				'<div style="width:42px;height:48px;display:inline-block;vertical-align:top;margin: 6px 5px 6px 5px;" />'
			)
			dialogElements.plusminus = []
			for (let colorIndex = 0; colorIndex < 3; colorIndex++) {
				let colorValue
				switch (colorIndex) {
					case 0:
						colorValue = "#f00"
						break
					case 1:
						colorValue = "#0f0"
						break
					case 2:
						colorValue = "#00f"
						break
				}
				dialogElements.plusminus[colorIndex] = e(
					`<div class="tw2gui_plusminus" style="display:inline-block;background-color:${colorValue};width:12px;height:46px;padding:1px;"><span class="butPlus" style="cursor:pointer;"></span><span style="width:12px;height:10px;display:inline-block;"></span><span class="butMinus" style="cursor:pointer;"></span></div>`
				)
				dialogElements.plusminus[colorIndex].children(".butMinus").click(
					(
						index => () =>
							adjustColorValue(index, false)
					)(colorIndex)
				)
				dialogElements.plusminus[colorIndex].children(".butPlus").click(
					(
						index => () =>
							adjustColorValue(index, true)
					)(colorIndex)
				)
				if (currentColor[colorIndex] === 0)
					dialogElements.plusminus[colorIndex].children(".butMinus").css("opacity", 0.3)
				if (currentColor[colorIndex] === 9)
					dialogElements.plusminus[colorIndex].children(".butPlus").css("opacity", 0.3)
				controlsContainer.append(dialogElements.plusminus[colorIndex])
			}
			dialogElements.input = e(
				`<input maxLength="3" type="text" value="${currentColor}" style="position: relative; top: -35px; left: 2px;color: rgb(255, 255, 255); font-weight: bold; letter-spacing: 6px; text-shadow: 1px 1px 1px rgb(0, 0, 0); width: 43px; background: none repeat scroll 0pt 0pt transparent; border: medium none; height: 18px; line-height: 18px; margin: 0pt; outline: medium none;" />`
			)
			dialogElements.input.keyup(() => {
				const inputValue = dialogElements.input.val()
				if (inputValue.length < 3 || !inputValue.match(/(\d){3}/)) {
					dialogElements.input.val(currentColor)
					return
				}
				currentColor = inputValue
				for (let colorIndex = 0; colorIndex < 3; colorIndex++) {
					dialogElements.plusminus[colorIndex]
						.children(".butMinus")
						.css("opacity", currentColor[colorIndex] === 0 ? 0.3 : 1)
					dialogElements.plusminus[colorIndex]
						.children(".butPlus")
						.css("opacity", currentColor[colorIndex] === 9 ? 0.3 : 1)
				}
				dialogElements.customColor.css("background-color", convertGameColorToRgb(currentColor))
				dialogElements.input.attr("value", currentColor)
			})
			controlsContainer.append(dialogElements.input)
			const formatOptions = { bold: chatTab._bold, caps: chatTab._caps }
			const checkboxContainer = e(
				'<div style="height:50px;display:inline-block;vertical-align:top;margin: 5px;" />'
			)
			const boldCheckbox = new west.gui.Checkbox(
				`*${Language._("misc.color_dialog_bold")}*`,
				formatOptions.bold ? "tw2gui_checkbox_checked" : "",
				() => {
					formatOptions.bold = !formatOptions.bold
				}
			)
			e(boldCheckbox.getMainDiv()).css("display", "block").css("margin-bottom", "5px")
			checkboxContainer.append(boldCheckbox.getMainDiv())
			const capsCheckbox = new west.gui.Checkbox(
				Language._("misc.color_dialog_caps"),
				formatOptions.caps ? "tw2gui_checkbox_checked" : "",
				() => {
					formatOptions.caps = !formatOptions.caps
				}
			)
			checkboxContainer.append(capsCheckbox.getMainDiv())
			const historyContainer = e(
				'<div style="width:160px;height:50px;display:inline-block;vertical-align:top;border: 1px solid #000;padding: 0px;margin: 5px;" />'
			)
			historyContainer.append(
				`<span style="width:140px;height:15px;display:inline-block;text-align:center;padding: 4px 0px 2px 0px;font-size:11px;">${Language._("misc.color_dialog_history")}</span>`
			)
			for (let historyIndex = 0; historyIndex < chatHistory.length; historyIndex++) {
				const historyColorButton = e(
					`<div style="width:20px;height:20px;display:inline-block;vertical-align:top;margin: 0px 0px 0px 10px;cursor:pointer;background-color:${convertGameColorToRgb(chatHistory[historyIndex])};" />`
				)
				historyColorButton.click(function () {
					applyChatFormatting(chatTab, {
						color: e(this).css("background-color"),
						bold: formatOptions.bold,
						caps: formatOptions.caps,
					})
					dialogElements.colorBox.hide()
				})
				historyContainer.append(historyColorButton)
			}
			const dialogContent = e("<div />")
				.append(dialogElements.customColor)
				.append(controlsContainer)
				.append(checkboxContainer)
				.append(historyContainer)
			dialogElements.colorBox = new west.gui.Dialog(
				Language._("misc.color_dialog_title"),
				dialogContent
			)
			dialogElements.colorBox.addButton(Language._("common.ok"), () => {
				applyChatFormatting(chatTab, {
					color: e(dialogElements.customColor).css("background-color"),
					bold: formatOptions.bold,
					caps: formatOptions.caps,
				})
			})
			dialogElements.colorBox.addButton(Language._("common.cancel"))
			dialogElements.colorBox.show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.chat_open_color_picker_dialog"))
		}
	}
	return chatApi
})(jQuery)
Debugger.Chat = Chat


const Collector = (function (_e) {
	const collectorApi = {}
	const _n = false
	let readyState = {}
	const initializeCollector = function () {
		if (readyState.ready) {
			return
		}
		try {
			// Patch tw2widget.Item to handle undefined this.obj
			GameInject.patchItemWidget()
			if (Settings.get("collector", true)) {
				GameInject.injectItem("Trader", "collector", function (itemData) {
					return updateCollectorItemDisplay(itemData)
				})
				GameInject.injectTrader("collector", function (itemData) {
					if (collectorApi.isNewItem(itemData.item_id)) {
						const iconHtml = `<img src="${Images.iconNew}" class="TWDBcollector" title="${Language._("collector.item_not_owned")}" style="position:absolute;top:0;left:0;padding:0;border:0;margin:0" />`
						return iconHtml
					}
					return ""
				})
				GameInject.injectMarket("collector", function (itemId) {
					return getCollectorMarketIcon(itemId)
				})
				GameInject.injectGetBids()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.collector_initialize"))
		}
	}
	readyState = Loader.add("Collector", "tw-db Collector", initializeCollector, {
		Settings: true,
	})
	collectorApi.isNewItem = function (itemId) {
		try {
			const item = w.ItemManager.get(itemId)
			if (!item) return false
			const bagItems = w.Bag.getItemsIdsByBaseItemId(item.item_base_id)
			const wornItem = w.Wear.wear[item.type]
			const isWorn = wornItem?.obj?.item_base_id === item.item_base_id
			const hasBid = TWDB.ClothCalc.bids[item.item_id]
			const hasRecipe = TWDB.ClothCalc.recipes[item.item_id]
			if (bagItems.length || isWorn || hasBid || hasRecipe) {
				return false
			} else {
				return true
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.collector_check_new_item"))
			return false
		}
	}
	const updateCollectorItemDisplay = function (itemData) {
		try {
			itemData.divMain.find(".TWDBcollector").remove()
			if (collectorApi.isNewItem(itemData.obj.item_id)) {
				if (!Images.iconNew) {
					waitForImages("iconNew", function () {
						updateCollectorItemDisplay(itemData)
					})
					return
				}
				itemData.divMain.append(
					`<img src="${Images.iconNew}" class="TWDBcollector" title="${Language._("collector.item_not_owned")}" style="position:absolute;top:-8px;left:-15px;padding:0;border:0;margin:0" />`
				)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.collector_update_item_display"))
		}
	}
	const getCollectorMarketIcon = function (itemId) {
		try {
			if (collectorApi.isNewItem(itemId)) {
				return `<img src="${Images.iconNew}" class="TWDBcollector" title="${Language._("collector.item_not_owned")}" style="width:18px;height:18px;position:relative;top:0;left:0;padding:0;border:0;margin:0" />`
			} else {
				return ""
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.collector_get_market_icon"))
			return ""
		}
	}
	return collectorApi
})($)
Debugger.Collector = Collector


const Snippets = (function ($) {
	const _self = {}
	const _timeout = null
	const _interval = null
	let loader = {}
	const initializeSnippets = function () {
		if (loader.ready) {
			return
		}
		try {
			trustTWDB()
			if (Settings.get("translation_texts", true)) {
				localizeSearchPlaceholders()
			}
			if (Settings.get("button_church", true)) {
				GameInject.MenuButton(
					TWDB.images.buttonChurch,
					Language._("misc.button_church_title"),
					addConstructionButton
				)
			}
			if (Settings.get("button_market", false)) {
				GameInject.MenuButton(
					TWDB.images.buttonMarket,
					Language._("misc.button_market_title"),
					addMarketButton
				)
			}
			if (Settings.get("wear_close", true)) {
				addCloseAllWearButton()
			}
			if (Settings.get("collector_sell", true)) {
				GameInject.injectWanderingTraderSellDialog()
			}
			if (Settings.get("custom_event_counter", true)) {
				repositionEventCounters()
			}
			if (Settings.get("scrollbars_off", false)) {
				disableScrollbars()
			}
			if (Settings.get("building_progress", true)) {
				townBuildingProgress()
			}
			if (Settings.get("church_levels", true)) {
				addChurchLevels()
			}
			if (Settings.get("improved_cityhall_tab", true)) {
				improvedCityhallTab()
			}
			if (Settings.get("fort_recruitment", true)) {
				activateFortRecruitment()
			}
			if (Settings.get("work_queue_off", true)) {
				removeWorkQueuePA()
			}
			if (Settings.get("fetch_all_off", false)) {
				removeVariousPA()
			}
			if (Settings.get("wof_nuggets_off", false)) {
				changeWofNuggets()
			}
			if (Settings.get("market_sell_dialog", true)) {
				enhanceMarketSellDialog()
			}
			if (Settings.get("weekly_crafting", true)) {
				weeklyCrafting()
			}
			if (Settings.get("pin_items", true)) {
				GameInject.injectInventoryAddItemsPinItems()
				GameInject.injectInventoryAddItemDivToInvPinItems()
			}
			if (Settings.get("telegram_bb_codes", true)) {
				GameInject.injectTelegramWindowAppendTelegramDisplaySource()
			}
			if (Settings.get("no_shop_sale", false)) {
				suppressOnGoingEntries()
			}
			if (Settings.get("exp_bar", true)) {
				expBarValues()
			}
			if (Settings.get("mini_chat", false)) {
				allowChatGuiMinimize()
			}
			if (Settings.get("task_list_points", true)) {
				addTaskJobsHints()
				GameInject.injectTaskJobs()
			}
			if (Settings.get("town_forum_blink", false)) {
				removeForumBlink()
			}
			if (Settings.get("enhanced_rankings", true)) {
				addEnhancedRankings()
			}
			if (Settings.get("profile_duel_exp", false)) {
				addDuelXpInProfiles()
			}
			if (Settings.get("regen_timers", true)) {
				addRegenTimers()
			}
			if (Settings.get("forum_select", true)) {
				selectForumText()
			}
			if (Settings.get("pin_important", true)) {
				TWDB.Util.addCss(`#ui_bottombar, #ui_menubar, #ui_experience_bar {z-index: 20!important;}`)
			}
			if (Settings.get("fortbattle_reminder", false)) {
				TWDB.Util.addCss(`.fort_battle_notification {display:none!important;}`)
			}
			if (Settings.get("night_mode", false)) {
				addNightMode()
			}
			if (Settings.get("blink_events", false)) {
				removeBlinkingEvents()
			}
			if (Settings.get("market_report", true)) {
				TWDB.Util.addCss(
					`.mpb_pickup, .wih_pickup {padding-left: 0!important; width: 65px!important; margin-left: -10px!important;}`
				)
				reworkMarketReport()
			}
			if (Settings.get("improved_market", false)) {
				improvedMarket()
			}
			if (Settings.get("job_show_lp", true)) {
				jobWindowLP()
			}
			if (Settings.get("whisper_improved", true)) {
				improvedWhisper()
			}
			if (Settings.get("instant_quest", false)) {
				addInstantQuests()
			}
			if (Settings.get("colored_quest", false)) {
				addColoredQuests()
			}
			if (Settings.get("import_westforts", true)) {
				importWestForts()
			}
			const _e = new ServerDate().date
			loader.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.snippets_initialize"))
		}
	}
	loader = Loader.add("Snippets", "tw-db code Snippets", initializeSnippets, {
		Settings: true,
	})
	const trustTWDB = function () {
		try {
			let str = showlink.toString()
			str = str.replace("the-west", "tw-db|the-west")
			str = str.replace("|com|", "|com|info|")
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`showlink = ${str}`)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.inject_showlink"))
		}
	}
	const addCloseAllWearButton = function () {
		const addBtn = () => {
			if (!Inventory?.window?.divMain) return
			const container = $(".tw2gui_window_buttons", Inventory.window.divMain)
			if (!container.length || container.find(".game_ext_close_all_button").length) return
			const btn = $(
				`<div class="tw2gui_window_buttons_closeall game_ext_close_all_button" title="<b>${Language._("misc.wear_close_tooltip")}</b>"></div>`
			)
			btn.on("click", () => {
				Inventory.window?.destroy?.()
				Inventory.dockedWindow?.destroy?.()
				document.querySelectorAll(".tw2gui_window.wear").forEach(win => {
					win.querySelector(".tw2gui_window_buttons_close")?.click() ||
						win.querySelector(".tw2gui_window_buttons_closeall")?.click() ||
						win.__windowInstance?.destroy?.() ||
						win.remove()
				})
				document.querySelector(".button.inventory.active")?.classList.remove("active")
			})
			container.append(btn)
		}

		// Initial check if inventory is already open
		addBtn()

		// Hook into Inventory.open() if available
		if (typeof Inventory !== "undefined" && Inventory.open) {
			const originalInventoryOpen = Inventory.open
			Inventory.open = function (...args) {
				const result = originalInventoryOpen.apply(this, args)
				// Check for inventory window after it opens
				setTimeout(() => {
					addBtn()
				}, 100)
				// Retry a few times in case window appears later
				let attempts = 0
				const retryInterval = setInterval(() => {
					attempts++
					addBtn()
					if (attempts >= 5 || Inventory?.window?.divMain) {
						clearInterval(retryInterval)
					}
				}, 200)
				return result
			}
		}

		// Listen for clicks on inventory button
		document.addEventListener(
			"click",
			function (e) {
				const target = e.target
				if (target?.closest?.(".button.inventory")) {
					setTimeout(() => {
						addBtn()
					}, 100)
					// Retry a few times
					let attempts = 0
					const retryInterval = setInterval(() => {
						attempts++
						addBtn()
						if (attempts >= 5 || Inventory?.window?.divMain) {
							clearInterval(retryInterval)
						}
					}, 200)
				}
			},
			true
		)
	}
	const addConstructionButton = function () {
		const churchClass = `build-${Character.homeTown.x}-${Character.homeTown.y}-church`
		document.querySelectorAll(`.${churchClass}`).forEach(win => {
			const closeBtn = win.querySelector(".tw2gui_window_buttons_close")
			if (closeBtn) {
				closeBtn.click()
				return
			}
			if (win.__windowInstance && typeof win.__windowInstance.destroy === "function") {
				win.__windowInstance.destroy()
				return
			}
			win.parentNode?.removeChild(win)
		})
		setTimeout(() => {
			if (BuildWindow && typeof BuildWindow.open === "function") {
				BuildWindow.open(
					Character.homeTown.town_id,
					Character.homeTown.x,
					Character.homeTown.y,
					"church",
					false
				)
			}
		}, 50)
	}
	const addMarketButton = function () {
		if (Character.homeTown.town_id) {
			Ajax.remoteCallMode(
				"town",
				"get_town",
				{
					x: Character.homeTown.x,
					y: Character.homeTown.y,
				},
				function (json) {
					if (json.error) return new UserMessage(json.msg).show()
					MarketWindow.open(
						Character.homeTown.town_id,
						json.allBuildings.market.stage,
						MarketWindow.townName
					)
					if (Wear?.window) {
						Wear.window.divMain.style.display = "none"
					}
				}
			)
		} else {
			MarketWindow.open()
			new UserMessage(Language._("errors.not_town_member"), UserMessage.TYPE_ERROR).show()
		}
	}
	const repositionEventCounters = function () {
		TWDB.Util.addCss(
			"@media (min-width: 1320px) { .custom_unit_counter {top: -1px!important; margin-left: 310px!important;} #hiro_friends_container {top: -1px!important; margin-right: 304px!important;} }"
		)
	}
	const localizeSearchPlaceholders = function () {
		if (localizeSearchPlaceholders._initialized) return
		localizeSearchPlaceholders._initialized = true

		function updateInput(el) {
			el.placeholder = Language._("common.search")
		}

		function checkAndUpdateSearchInputs() {
			document.querySelectorAll('input[placeholder="Search"]').forEach(el => {
				if (el.placeholder === "Search") {
					updateInput(el)
				}
			})
		}

		// Initial check for existing inputs
		checkAndUpdateSearchInputs()

		// Hook into west.window.shop.open() if available
		if (
			typeof west !== "undefined" &&
			west.window &&
			west.window.shop &&
			west.window.shop.open &&
			!west.window.shop.open.__twdb_localizeSearchPlaceholders
		) {
			const originalShopOpen = west.window.shop.open
			const wrapped = function (...args) {
				const result = originalShopOpen.apply(this, args)
				// Check for search inputs after shop opens
				setTimeout(() => {
					checkAndUpdateSearchInputs()
				}, 100)
				// Retry a few times in case input appears later
				let attempts = 0
				const retryInterval = setInterval(() => {
					attempts++
					checkAndUpdateSearchInputs()
					if (attempts >= 5) {
						clearInterval(retryInterval)
					}
				}, 200)
				return result
			}
			wrapped.__twdb_localizeSearchPlaceholders = true
			wrapped.__twdb_original = originalShopOpen
			west.window.shop.open = wrapped
		}

		// Listen for clicks on shop/trader buttons
		if (!localizeSearchPlaceholders._clickListener) {
			localizeSearchPlaceholders._clickListener = function (e) {
				const target = e.target
				if (
					target?.closest &&
					(target.closest(".button.shop") ||
						target.closest(".search_button") ||
						target.closest('[onclick*="shop"]') ||
						target.closest('[onclick*="trader"]') ||
						target.closest('[href*="shop_trader"]'))
				) {
					setTimeout(() => {
						checkAndUpdateSearchInputs()
					}, 100)
				}
			}
			document.addEventListener("click", localizeSearchPlaceholders._clickListener, true)
		}
	}
	const disableScrollbars = function () {
		$("body").css({ overflow: "hidden" })
	}
	const addChurchLevels = function () {
		BuildWindow.updateLaborPoints_backup = BuildWindow.updateLaborPoints
		BuildWindow.updateLaborPoints = function (points) {
			BuildWindow.updateLaborPoints_backup.call(this, points)
			if (this.building === "church" && points > 0) {
				const stageCount = Math.floor(
					this.window.$("div.build_progress_nfo > span.text_bold").text() / 15
				)
				this.window
					.$("div.build_progress_nfo")
					.append(` (${stageCount >= 0 ? "+" : ""}${stageCount} ${Language._("misc.levels")})`)
			}
		}
	}
	const townBuildingProgress = function () {
		BuildWindow.initInfo_backup = BuildWindow.initInfo
		BuildWindow.initInfo = function (data) {
			BuildWindow.initInfo_backup.call(this, data)
			const tmp = $(
				`<div class="rp_row_jobdata row_build_hammer" style="margin:-2px 0 ${$(".twir_bestwear").length ? "-24px" : "0"} 0;" title="${Language._("building.progress_label")}: ${Language._("building.progress_tooltip")}"><span class="rp_jobdata_label_icon"><img src="${Game.cdnURL}/images/icons/hammer.png" alt="" /></span><span class="rp_jobdata_label text_bold">${Language._("building.progress_label")}</span><span class="rp_jobdata_text text_bold"></span></div>`
			)
			$("span.rp_jobdata_text", tmp).append(
				new west.gui.Progressbar(data.build_point, data.build_point_limit).getMainDiv()
			)
			$(`.build-${data.x}-${data.y}-${data.build_key} div.build_info`).append(tmp)
		}
	}
	const improvedCityhallTab = function () {
		CityhallWindow.Build.fillContent_backup = CityhallWindow.Build.fillContent
		CityhallWindow.Build.fillContent = function (data) {
			this.table.clearBody()
			for (let i = 0; i < data.length; i++) {
				const r = data[i]
				let build_text
				if (!this.main.ownTown) {
					this.table.appendRow()
					build_text = r.name
					this.table
						.appendToCell(-1, "building_foreign", build_text)
						.appendToCell(
							-1,
							"stage",
							`${r.stage} / ${
								r.infinite
									? `<img src='${Game.cdnURL}/images/xp_inf_000.png' style='padding-bottom: 4px;'/>`
									: r.maxStage
							}`
						)
				} else if (r.stage === r.maxStage && !r.infinite) {
				} else {
					this.table.appendRow()
					build_text = `<a href="#" onClick="javascript:void(BuildWindow.open(${Character.homeTown.town_id}, ${Character.homeTown.x}, ${Character.homeTown.y}, '${r.key}', false));">${r.name}</a></span>`
					this.table
						.appendToCell(-1, "building", build_text)
						.appendToCell(
							-1,
							"stage",
							`${r.stage} / ${
								r.infinite
									? `<img src='${Game.cdnURL}/images/xp_inf_000.png' style='padding-bottom: 4px;'/>`
									: r.maxStage
							}`
						)
						.appendToCell(
							-1,
							"progress",
							new west.gui.Progressbar(r.buildPoints, r.nextStagePoints).getMainDiv()
						)
				}
			}
		}
	}
	const allowChatGuiMinimize = function () {
		TWDB.Util.addCss(
			`div#ui_bottomleft{width:auto;overflow:hidden}div#ui_chat{margin-top:12px}div#ui_chat div#toggleMinChat{position:absolute;top:-14px;left:5px;width:27px;display:block;background-size:108px 42px;border:0 solid rgba(0,0,0,0);background-clip:content-box}div#ui_chat.minchat div#toggleMinChat{background-position:0 0;border-width:0 8px 34px 0}div#ui_chat.minchat div#servertime{display:none}div#ui_chat.minchat>div.tabs div{display:none}div#ui_chat.minchat div.container div.friend{display:none!important}div#ui_chat.minchat div.container div.general{display:block!important}div#ui_chat.minchat div.container div.vertical_divider{display:none}div#ui_chat.minchat img.leave_channel{display:none!important}div#ui_chat div.minchat_tabr{display:none}div#ui_chat.minchat div.minchat_tabr{display:block;position:absolute;left:32px;top:0;width:8px;height:34px;background:url("${to_cdn("images/interface/chat/chat-top.png?1")}") top right}div#ui_chat.minchat{position:relative;left:-10px;top:4px;width:39px}div#ui_chat.minchat>div.tabs{width:32px;background:url("${to_cdn("images/interface/chat/chat-top.png?1")}")}div#ui_chat.minchat div.chat_channel{width:24px}div#ui_chat.minchat div.chat_channel .new_message{left:2px;top:0}div#ui_chat.minchat div.chat_channel div.online_count{background:none;position:absolute;right:0;top:-1px;width:auto;height:auto;line-height:normal;padding:0;font-size:8pt;font-weight:bold;text-align:right;text-shadow:-1px 1px 1px #FFF,0 0 2px #FFF;cursor:default}div#ui_chat.minchat div.container{width:40px;background-position-x:right}div#ui_chat.minchat div.row_title{left:5px;width:32px;opacity:0}div#ui_chat.minchat div.tw2gui_scrollpane{width:50px}`,
			"minchat"
		)
		$("div#ui_chat")
			.append('<div class="minchat_tabr" />')
			.toggleClass("minchat", Settings.get("mini_chat_min", true))
			.children(".tabs")
			.first()
			.append(
				$('<div id="toggleMinChat" class="tw2gui_arrow_up_top" />').on("click", function (e) {
					e.stopPropagation()
					Settings.set("mini_chat_min", $("div#ui_chat").toggleClass("minchat").hasClass("minchat"))
					return false
				})
			)
	}
	const addTaskJobsHints = function () {
		try {
			TWDB.Util.addCss(
				`div#ui_workcontainer div.twdb_lp_hint{position:absolute;left:2px;width:18px;height:18px;background-color:#432;border:2px ridge #976;border-radius:11px;background-blend-mode:soft-light}div.twdb_lp_hint>img{position:absolute;left:1px;top:1px}`
			)
			const updateTaskQueueHints = function () {
				if (TaskQueue.queue.length) {
					let index
					const container = $("div#ui_workcontainer")
					let icon
					let isSuboptimal
					for (index = 0; index < TaskQueue.queue.length; index++) {
						if (TaskQueue.queue[index].type === "job") {
							icon = null
							isSuboptimal =
								TWDB.ClothCalc.calcdata.loaded &&
								TaskQueue.queue[index].data.job_points <
									TWDB.ClothCalc.calcdata.jobs[TaskQueue.queue[index].data.job.id].laborpoints.sum -
										5
							if (TaskQueue.queue[index].data.job_points < 0) {
								icon = west.gui.Icon.get("exclamation-priority-3", Language._("task.negative_lp"))
							} else if (
								TaskQueue.queue[index].data.job_points <
								TaskQueue.queue[index].data.job.malus / 5
							) {
								icon = west.gui.Icon.get("exclamation-priority-2", Language._("task.low_lp"))
							} else if (isSuboptimal) {
								icon = west.gui.Icon.get("exclamation-priority-1", Language._("task.suboptimal_lp"))
							}
							if (icon !== null) {
								$(`.task-queuePos-${index} > div.icon`, container)
									.children(".twdb_lp_hint")
									.remove()
									.end()
									.append(
										$('<div class="twdb_lp_hint" />')
											.toggleClass("tw2gui-iconset tw2gui-icon-star", !isSuboptimal)
											.append(icon)
									)
							}
						}
					}
				}
			}
			EventHandler.listen(["taskqueue-updated", "taskqueue-ready"], updateTaskQueueHints)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_task_queue_hints"))
		}
	}
	const expBarValues = () => {
		// if (isDefined(w.SlySuite)) return TWDB.Settings.set("exp_bar", false)
		TWDB.Util.addCss(
			`div#ui_experience_bar .label {text-shadow: 3px 1px 1px #000,3px -1px 1px #000,-2px 1px 1px #000,-2px 0px 0px #000;}`
		)
		const formatNumber = n => {
			const abs = Math.abs(n)
			return abs >= 1e6
				? `${(n / 1e6).toFixed(2)}m`
				: abs >= 1e3
					? `${(n / 1e3).toFixed(1)}k`
					: n.toString()
		}
		const updateExpBar = () => {
			const $bar = $("#ui_experience_bar")
			const data =
				Character.getTrackingAchievement() === undefined
					? WestUi.updateTrackXp($bar)
					: WestUi.updateTrackAchievement($bar)
			$(".label", $bar).off("mouseenter mouseleave")
			$(".label span", $bar).show()
			const labelText =
				Character.level < 250
					? `${data.percent}% - ${formatNumber(data.current)} / ${formatNumber(data.required)} (${formatNumber(data.required - data.current)})`
					: Character.experience.toLocaleString()
			$(".label span", $bar).html(labelText)
		}
		EventHandler.listen("character_exp_changed", updateExpBar)
		EventHandler.listen("character_tracking_achievement_changed", updateExpBar)
		updateExpBar()
	}
	const suppressOnGoingEntries = function () {
		try {
			const suppressedClasses = ["shop_sale"]
			const suppressNotificationEntry = function (className) {
				if ($.isArray(className)) {
					for (let index = 0; index < className.length; index++) {
						suppressNotificationEntry(className[index])
					}
				} else if (typeof className === "string") {
					const notificationList = WestUi.NotiBar.main.list
					for (let idx = 0; idx < notificationList.length; idx++) {
						if ($(notificationList[idx].element).children().is(`div.image.${className}`)) {
							WestUi.NotiBar.remove(notificationList[idx])
						}
					}
				}
			}
			const manipulateNotificationBar = function (suppressedList) {
				try {
					WestUi.NotiBar.__twdb__add = WestUi.NotiBar.__twdb__add || WestUi.NotiBar.add
					WestUi.NotiBar.add = function (notification, ...args) {
						const imageElement = $(".image", notification.element)
						for (let index = 0; index < suppressedList.length; index++) {
							if (imageElement.hasClass(suppressedList[index])) {
								return
							}
						}
						WestUi.NotiBar.__twdb__add.apply(this, [notification, ...args])
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.ui_manipulate_notification_bar"))
				}
			}
			manipulateNotificationBar(suppressedClasses)
			suppressNotificationEntry(suppressedClasses)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_suppress_notifications"))
		}
	}
	const removeWorkQueuePA = function () {
		try {
			TWDB.Util.addCss("#queuedTasks .buyPremiumTask {background: none!important}")
			Premium.checkForAutomationPremium = function (_e, callback) {
				if (typeof callback !== "undefined") return callback()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_remove_work_queue_pa"))
		}
	}
	const changeWofNuggets = function () {
		try {
			west.gui.payHandler.prototype.__twdb__addPayOption =
				west.gui.payHandler.prototype.addPayOption
			west.gui.payHandler.prototype.addPayOption = function (paymentOption, ...args) {
				this.__twdb__addPayOption.apply(this, [paymentOption, ...args])
				if (
					false === paymentOption ||
					"nugget" === paymentOption ||
					2 === paymentOption ||
					2 === paymentOption.id
				) {
					return this
				}
				this.setSelectedPayId(paymentOption.id || paymentOption)
				return this
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_change_wof_nuggets"))
		}
	}
	const removeVariousPA = function () {
		const suppressedPrompts = []
		let suppressRegex
		if (Settings.get("fetch_all_off", false)) suppressedPrompts.push("marketdelivery all")
		if (!suppressedPrompts.length) return
		suppressRegex = new RegExp(suppressedPrompts.join("|"))
		try {
			Premium.twdb_confirmUse = Premium.confirmUse
			Premium.confirmUse = function (
				promptText,
				param1,
				param2,
				param3,
				param4,
				param5,
				callback,
				param7
			) {
				if (suppressRegex.test(promptText)) {
					if (typeof callback !== "undefined") return callback()
				} else {
					return Premium.twdb_confirmUse(
						promptText,
						param1,
						param2,
						param3,
						param4,
						param5,
						callback,
						param7
					)
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_remove_various_pa"))
		}
	}
	const activateFortRecruitment = function () {
		try {
			TWDB.Util.addCss(`.twir_fb_sector_map_btn{display:none}.TWDS_charinfocolor{margin-top:20px}`)
			FortBattleWindow.__twdb__getInfoArea =
				FortBattleWindow.__twdb__getInfoArea || FortBattleWindow.getInfoArea
			FortBattleWindow.getInfoArea = function (...args) {
				this.preBattle.battleData.canSetPrivilege = true
				return FortBattleWindow.__twdb__getInfoArea.apply(this, args)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ui_activate_fort_recruitment"))
		}
	}
	const enhanceMarketSellDialog = function () {
		let itemData
		let settings = TWDB.Cache.load("msdsettings")
		if (typeof settings !== "object" || settings === null) {
			settings = { cb: {} }
		} else if (typeof settings.cb !== "object" || settings.cb === null) {
			settings.cb = {}
		}
		try {
			if (!isDefined(west.gui.Dialog.prototype.__twdb__show)) {
				west.gui.Dialog.prototype.__twdb__show = west.gui.Dialog.prototype.show
			}
			if (TWDB.script.isDev()) {
				west.gui.Dialog.prototype.show = function () {
					if (this.divMain.attr("id") === "market_createoffer_window") {
						const dialog = this.__twdb__show()
						w.setTimeout(function () {
							MarketWindow.TWDB_touchUpSellDialog(dialog)
						}, 25)
						return dialog
					}
					const specialDialogs = ["div#equip_manager_list", "span.twdb_banking"].join(", ")
					if ($(this.divMain).find(specialDialogs).addBack().is(specialDialogs)) {
						return this.setModal(false).setBlockGame(false).setDraggable(true).__twdb__show()
					}
					return this.__twdb__show()
				}
			} else {
				west.gui.Dialog.prototype.show = function () {
					if (this.divMain.attr("id") === "market_createoffer_window") {
						const dialog = this.__twdb__show()
						w.setTimeout(function () {
							MarketWindow.TWDB_touchUpSellDialog(dialog)
						}, 25)
						return dialog
					}
					return this.__twdb__show()
				}
			}
			if (!isDefined(MarketWindow.TWDB_createMarketOffer)) {
				MarketWindow.TWDB_createMarketOffer = MarketWindow.createMarketOffer
			}
			MarketWindow.createMarketOffer = function (itemSelector) {
				let itemId =
					typeof itemSelector === "number" ? itemSelector : $(itemSelector).data("itemId")
				if (itemId === undefined) {
					const droppedObj = $(this).data("dnd_droppedObj")
					itemId = droppedObj.data("itemId")
				}
				itemData = w.ItemManager.get(itemId)
				return MarketWindow.TWDB_createMarketOffer(itemId)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_enhance_sell_dialog"))
		}
		MarketWindow.TWDB_touchUpSellDialog = function (dialog) {
			if (dialog.divMain.attr("id") !== "market_createoffer_window") {
				return
			}
			const dialogContent = $("div.tw2gui_dialog_content", dialog.divMain)
			if (dialogContent.find("#auction_item_slot", dialogContent).html() === "")
				return w.setTimeout(function () {
					MarketWindow.TWDB_touchUpSellDialog(dialog)
				}, 25)
			$("div.tw2gui_dialog_framefix").css({
				left: "50%",
				top: "50%",
				width: "1px",
				height: "1px",
			})
			$("textarea#auction_description", dialogContent)
				.css("width", "270px")
				.closest("tr")
				.append("<td id='twdb_msd_desc_cc'>")
			const settingsTable = $("table:nth-child(2)", dialogContent)
			$("tr:first-child", settingsTable).after(
				$("<tr>").append(
					'<td id="twdb_msd_bid_btn_cc">',
					'<td id="twdb_msd_bid_cc" style="min-width: 90px;">',
					'<td id="twdb_msd_buy_btn_cc">',
					'<td id="twdb_msd_buy_cc" style="min-width: 90px;">'
				)
			)
			$("tr:nth-last-child(5) td:nth-child(2) span.tw2gui_textfield", settingsTable).after(
				`<span id="twdb_msd_mult_cc" title="${Language._("market.sell_multiply")}" style="background-image: url("/images/ranking/town_ranking_icons.png"); display:inline-block; height:16px; width:16px; background-position:0px -80px; cursor:pointer;"> </span>`
			)
			$("tr:last-child td:first-child", settingsTable)
				.attr("colspan", 3)
				.before('<td id="twdb_msd_opt_cc">')
			const centerMarketDialog = function () {
				try {
					dialog.divMain.css({
						"margin-top": `-${dialog.divMain.height() / 2}px`,
						"margin-left": `-${dialog.divMain.width() / 2}px`,
					})
				} catch (error) {
					ErrorModule.report(error, Language._("errors.market_center_dialog"))
				}
			}
			const handleCheckboxSelection = function () {
				try {
					let selectedValue
					const groupClass = this.groupClass
					$(`div.tw2gui_checkbox.${groupClass}`)
						.not(this.divMain)
						.removeClass("tw2gui_checkbox_checked")
					if (this.isSelected()) {
						selectedValue = this.getValue()
						this.divMain.next().click()
					} else {
						selectedValue = 0
					}
					settings.cb[groupClass] = selectedValue
					TWDB.Cache.save("msdsettings", settings)
					new UserMessage(Language._("common.save_success"), UserMessage.TYPE_SUCCESS).show()
					return this
				} catch (error) {
					ErrorModule.report(error, Language._("errors.market_handle_checkbox"))
				}
			}
			const saveMarketSettings = function (settingKey, settingValue) {
				try {
					settings[settingKey] = settingValue
					TWDB.Cache.save("msdsettings", settings)
					new UserMessage(Language._("common.save_success"), UserMessage.TYPE_SUCCESS).show()
				} catch (error) {
					ErrorModule.report(error, Language._("errors.market_save_settings"))
				}
			}
			const restoreMarketSettings = function () {
				try {
					let checkboxKey
					let checkboxElement
					for (checkboxKey in settings.cb) {
						if (!Object.hasOwn(settings.cb, checkboxKey)) continue
						$(`div.tw2gui_checkbox.${checkboxKey}`).each(function () {
							checkboxElement = $(this).guiElement()
							if (checkboxElement.getValue() === settings.cb[checkboxKey]) {
								checkboxElement.setSelected(true, true)
								$(this).next().click()
							}
						})
					}
					$("textarea#auction_description", dialogContent).val(settings.description || "")
					$("span#market_days.tw2gui_combobox", dialogContent)
						.guiElement()
						.select(settings.duration || 1)
					$("span#market_rights.tw2gui_combobox", dialogContent)
						?.guiElement()
						?.select(isDefined(settings.rights) ? settings.rights : 2)
				} catch (error) {
					ErrorModule.report(error, Language._("errors.market_restore_settings"))
				}
			}
			$("#twdb_msd_desc_cc", dialogContent).append(
				$(
					`<div class="tw2gui-iconset tw2gui-icon-save" title="${Language._("market.sell_save_desc")}">`
				).click(function () {
					saveMarketSettings("description", $("textarea#auction_description", dialogContent).val())
				}),
				$(
					`<div class="tw2gui-iconset tw2gui-icon-abort" title="${Language._("market.sell_reset_desc")}">`
				).click(function () {
					saveMarketSettings("description", "")
					$("textarea#auction_description", dialogContent).val("")
				})
			)
			$("#twdb_msd_bid_btn_cc", dialogContent).append(
				$(
					`<span class="tw2gui-iconset tw2gui-icon-abort" title="${Language._("market.sell_reset_sel")}" style="display: inline-block;">`
				).click(function () {
					$("div.tw2gui_checkbox.twdb_msd_bid_fix", dialogContent).each(function () {
						const checkbox = $(this).guiElement()
						if (checkbox?.isSelected()) {
							checkbox.setSelected(false, true)
							handleCheckboxSelection.call(checkbox)
						}
					})
					$("#market_min_bid", dialogContent).val("").keyup()
				})
			)
			$("#twdb_msd_buy_btn_cc", dialogContent).append(
				$(
					`<span class="tw2gui-iconset tw2gui-icon-abort" title="${Language._("market.sell_reset_sel")}" style="display: inline-block;">`
				).click(function () {
					$("div.tw2gui_checkbox.twdb_msd_buy_fix", dialogContent).each(function () {
						const checkbox = $(this).guiElement()
						if (checkbox?.isSelected()) {
							checkbox.setSelected(false, true)
							handleCheckboxSelection.call(checkbox)
						}
					})
					$("#market_max_price", dialogContent).val("").keyup()
				})
			)
			$("#twdb_msd_buy_cc", dialogContent)
				.append(
					new west.gui.Checkbox("", "twdb_msd_buy_fix", handleCheckboxSelection)
						.setTitle(Language._("market.use_as_default_price"))
						.setValue(2).divMain
				)
				.append(
					$(`<div class="tw2gui_checkbox" title="${Language._("market.sell_buy_price")}">`)
						.append('<span class="invPopup_buyicon" style="height:20px;">')
						.click(function () {
							$("#market_max_price", dialogContent)
								.val(itemData.price || 1)
								.keyup()
						})
				)
				.append("&nbsp;&nbsp;")
				.append(
					new west.gui.Checkbox("", "twdb_msd_buy_fix", handleCheckboxSelection)
						.setTitle(Language._("market.use_as_default_price"))
						.setValue(1).divMain
				)
				.append(
					$(`<div class="tw2gui_checkbox" title="${Language._("market.sell_sell_price")}">`)
						.append('<span class="invPopup_sellicon" style="height:20px;">')
						.click(function () {
							$("#market_max_price", dialogContent)
								.val(itemData.sell_price || Math.round(itemData.price / 2) || 1)
								.keyup()
						})
				)
			$("#twdb_msd_bid_cc", dialogContent)
				.append(
					new west.gui.Checkbox("", "twdb_msd_bid_fix", handleCheckboxSelection)
						.setTitle(Language._("market.use_as_default_price"))
						.setValue(2).divMain
				)
				.append(
					$(`<div class="tw2gui_checkbox" title="${Language._("market.sell_buy_price")}">`)
						.append('<span class="invPopup_buyicon" style="height:20px;">')
						.click(function () {
							$("#market_min_bid", dialogContent)
								.val(itemData.price || 1)
								.keyup()
						})
				)
				.append("&nbsp;&nbsp;")
				.append(
					new west.gui.Checkbox("", "twdb_msd_bid_fix", handleCheckboxSelection)
						.setTitle(Language._("market.use_as_default_price"))
						.setValue(1).divMain
				)
				.append(
					$(`<div class="tw2gui_checkbox" title="${Language._("market.sell_sell_price")}">`)
						.append('<span class="invPopup_sellicon" style="height:20px;">')
						.click(function () {
							$("#market_min_bid", dialogContent)
								.val(itemData.sell_price || Math.round(itemData.price / 2) || 1)
								.keyup()
						})
				)
			$("#twdb_msd_mult_cc", dialogContent).click(function () {
				let priceValue
				const stackSize = parseInt($("#market_sell_itemStack", dialogContent).val(), 10)
				if (stackSize > 0) {
					priceValue = parseInt($("#market_min_bid", dialogContent).val(), 10)
					if (priceValue > 0) {
						$("#market_min_bid", dialogContent)
							.val(stackSize * priceValue)
							.keyup()
					}
					priceValue = parseInt($("#market_max_price", dialogContent).val(), 10)
					if (priceValue > 0) {
						$("#market_max_price", dialogContent)
							.val(stackSize * priceValue)
							.keyup()
					}
				}
			})
			$("#twdb_msd_opt_cc", dialogContent).append(
				$(
					`<span class="tw2gui-iconset tw2gui-icon-save" title="${Language._("market.sell_save_duration")}" style="display: inline-block;">`
				).click(function () {
					saveMarketSettings(
						"duration",
						parseInt($("#market_days", dialogContent).data("value"), 10)
					)
					saveMarketSettings(
						"rights",
						parseInt($("#market_rights", dialogContent).data("value"), 10)
					)
				}),
				$(
					`<span class="tw2gui-iconset tw2gui-icon-abort" title="${Language._("market.sell_reset_sel")}" style="display: inline-block;">`
				).click(function () {
					saveMarketSettings("duration", 1)
					$("span#market_days.tw2gui_combobox", dialogContent).guiElement().select(1)
					saveMarketSettings("rights", 2)
					$("span#market_rights.tw2gui_combobox", dialogContent).guiElement().select(2)
				})
			)
			const f = $("span#market_rights.tw2gui_combobox", dialogContent)?.guiElement()?.items
			if (f && f.length === 3) {
				const l = ["home", "flag", "world"]
				for (let c = 0; c < f.length; c++) {
					f[c].node[0].innerHTML =
						`<span class="tw2gui-iconset tw2gui-icon-${l[f[c].value]}" style="display: inline-block;position: relative;top: 4px;"></span> ${f[c].node[0].innerHTML}`
				}
			}
			const h = $("h4", dialogContent)
			const p = $("table#mps_otheroffers", dialogContent)
			if ($("tr", p).length > 2 || $("tr:nth-child(2) > td", p).attr("colspan") !== 4) {
				h.html(`${h.html()} (${$("tr", p).length - 1})`)
					.click(function () {
						p.toggle()
						centerMarketDialog()
					})
					.css({ cursor: "pointer" })
			} else {
				h.html(`${h.html()} (0)`)
				p.hide()
			}
			centerMarketDialog()
			restoreMarketSettings()
		}
	}
	const weeklyCrafting = function () {
		if (w.Character.professionId && w.Character.professionSkill > 599) {
			const showCraftingNotification = function (itemId) {
				try {
					const notificationEntry = new OnGoingEntry()
					const item = ItemManager.get(itemId)
					if (!item || !item.craftitem) {
						return
					}
					const craftItem = ItemManager.get(item.craftitem)
					if (!craftItem) {
						return
					}
					const tooltipHtml = `<div style='text-align:center;'>${Language._("crafting.can_craft_again")}<br /><div class="item  item_inventory" style="display:inline-block;float:none;"><img class="tw_item item_inventory_img" src="${craftItem.image}"></div><br />${craftItem.name}</div>`
					notificationEntry.init(
						"",
						function () {
							CharacterWindow.open("crafting")
							TWDB.Cache.save("craftingCheck", {
								found: false,
								date: null,
							})
						},
						11
					)
					notificationEntry.setTooltip(tooltipHtml)
					notificationEntry.setImageClass("work")
					notificationEntry.highlightBorder()
					WestUi.NotiBar.add(notificationEntry)
					TitleTicker.setNotifyMessage(Language._("crafting.notification"))
				} catch (error) {
					ErrorModule.report(error, Language._("errors.ui_show_crafting_notification"))
				}
			}
			const checkCraftingTimer = function () {
				try {
					const cachedData = TWDB.Cache.load("craftingCheck") || {
						found: false,
						date: null,
					}
					if (!cachedData.found) {
						return
					}
					const timeRemaining = new Date(cachedData.date).getTime() - new ServerDate().getTime()
					if (timeRemaining < 0) {
						return showCraftingNotification(cachedData.found)
					} else if (timeRemaining < 864e5) {
						if (timeRemaining < 18e4) {
							w.setTimeout(function () {
								showCraftingNotification(cachedData.found)
							}, timeRemaining)
						} else {
							w.setTimeout(
								function () {
									checkCraftingTimer()
								},
								parseInt(timeRemaining / 2, 10)
							)
						}
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.ui_check_crafting_timer"))
				}
			}
			// biome-ignore lint/correctness/noUnusedVariables: <testing>
			const fetchCraftingData = function () {
				try {
					Ajax.remoteCall("crafting", "", {}, function (response) {
						if (response.error) {
							return new UserMessage(response.msg).show()
						}
						if (Object.hasOwn(response, "recipes_content") && response.recipes_content.length > 0) {
							let recipeIndex
							const weeklyRecipeIds = [20099e3, 20104e3, 20109e3, 20114e3]
							for (recipeIndex = 0; recipeIndex < response.recipes_content.length; recipeIndex++) {
								if (weeklyRecipeIds.indexOf(response.recipes_content[recipeIndex].item_id) !== -1) {
									if (response.recipes_content[recipeIndex].last_craft) {
										TWDB.Cache.save("craftingCheck", {
											found: response.recipes_content[recipeIndex].item_id,
											date: new Date(
												new ServerDate().getTime() +
													parseInt(response.recipes_content[recipeIndex].last_craft * 1e3, 10)
											),
										})
									} else {
										TWDB.Cache.save("craftingCheck", {
											found: response.recipes_content[recipeIndex].item_id,
											date: new Date(null),
										})
									}
									return checkCraftingTimer()
								}
							}
						}
						TWDB.Cache.save("craftingCheck", { found: false, date: null })
					})
				} catch (error) {
					ErrorModule.report(error, Language._("errors.ui_fetch_crafting_data"))
				}
			}
			checkCraftingTimer()
		}
	}
	const removeForumBlink = function () {
		setTimeout(function () {
			$("div.city > div.city").removeClass("dock-highlight")
		}, 1000)
		//The West Menu
		setTimeout(function () {
			$("#TWM_bottombar div.city > div.Stadt").removeClass("TWM_highlight")
		}, 1000)
	}
	const addEnhancedRankings = function () {
		const rankPlayerCache = `twdb_${Character.playerId}_playercategory`
		const playerChars = JSON.parse(localStorage.getItem(rankPlayerCache) || "{}")
		const charClass = [null, "greenhorn", "duelist", "adventurer", "worker", "soldier"]
		const playerNameSelectors = [
			".exp_playername",
			".duel_playername",
			".forts_playername",
			".craft_playername",
			".build_playername",
			".mpi_playername",
			".achieve_playername",
			".skill_playername",
		]
		function addCharClassToCell(cell) {
			const pIdMatch = cell.innerHTML.match(/open\((\d+)/)
			if (!pIdMatch) return
			const pId = pIdMatch[1]
			if (!playerChars[pId])
				return getCharClass(pId, function () {
					addCharClassToCell(cell)
				})
			const charC = charClass[playerChars[pId]]
			$(cell).prepend(
				`<img src="images/class_choose/class_${charC}.png" title="${Game.InfoHandler.getLocalString4Charclass(charC)}"> `
			)
		}
		function getCharClass(_pId, callback) {
			Ajax.remoteCallMode(
				"ranking",
				"get_data",
				{
					tab: "experience",
					entries_per_page: 9999,
				},
				function (json) {
					for (const jr of json.ranking) {
						playerChars[jr.player_id] = charClass.indexOf(jr.class)
					}
					localStorage.setItem(rankPlayerCache, JSON.stringify(playerChars))
					if (callback) callback()
				}
			)
		}
		function injectCharIcons() {
			playerNameSelectors.forEach(sel => {
				const cells = $(sel)
				for (let i = 0; i < cells.length; i++) {
					addCharClassToCell(cells[i])
				}
			})
		}
		TWDB.Util.addCss(
			`#ranking_exptable div.exp_exp,#ranking_duel div.duel_exp{text-align:center}#ranking_exptable div.exp_town,#ranking_duel div.duel_town,#ranking_cities .tbody .town_member_lvl{padding-left:10px}#ranking_duel div.duel_win,#ranking_duel div.duel_loss,#ranking_duel div.duel_diff{margin-right:5px}#ranking_crafting div.craft_profession_id{width:115px}#ranking_cities .row_head .town_member_lvl span{margin:0 20px}#ranking_exptable div.exp_class{display:none}#ranking_exptable div.exp_playername{width:260px}#ranking_adventures div.mpi_knockouts,#ranking_adventures div.mpi_total_actions,#ranking_adventures div.mpi_games_played,#ranking_adventures div.mpi_friendly_dmg{width:80px}#ranking_adventures div.mpi_rage_quits{width:88px}div.ranking span.search_lable_span{top:10px}`
		)
		function customRankingColumns(selectors) {
			selectors.forEach(sel => {
				const elements = $(`${sel.selector}:not(${sel.skip})`)
				for (let i = 0; i < elements.length; i++) {
					if (sel.hidden) {
						$(elements[i]).hide()
					} else {
						elements[i].innerText = format_number(elements[i].innerText)
						if (sel.diff && i !== 0) {
							elements[i].title = format_number(
								deformat_number(elements[i].innerText) - deformat_number(elements[i - 1].innerText)
							)
						}
					}
				}
			})
		}
		function rankingUpdate(module, selectors) {
			module.updateTable_backup = module.updateTable
			module.updateTable = function (be_data) {
				module.updateTable_backup.call(this, be_data)
				customRankingColumns(selectors)
				injectCharIcons()
			}
		}
		rankingUpdate(RankingWindow.Experience, [
			{ selector: ".exp_exp", skip: "div.cell.cell_3", diff: true },
			{ selector: ".exp_class", skip: "div.cell.cell_4", diff: true, hidden: true },
		])
		rankingUpdate(RankingWindow.Duels, [
			{ selector: ".duel_exp", skip: "div.cell.cell_2", diff: true },
			{ selector: ".duel_win", skip: "div.cell.cell_3", diff: true },
			{ selector: ".duel_loss", skip: "div.cell.cell_4", diff: true },
			{ selector: ".duel_diff", skip: "div.cell.cell_5", diff: false },
		])
		rankingUpdate(RankingWindow.FortBattles, [
			{ selector: ".forts_score", skip: "div.cell.cell_2", diff: true },
			{ selector: ".forts_damage_dealt", skip: "div.cell.cell_3", diff: true },
			{ selector: ".forts_hits_taken", skip: "div.cell.cell_4", diff: true },
			{ selector: ".forts_dodges", skip: "div.cell.cell_5", diff: true },
		])
		rankingUpdate(RankingWindow.Crafting, [
			{ selector: ".craft_score", skip: "div.cell.cell_4", diff: true },
			{ selector: ".craft_items_created", skip: "div.cell.cell_5", diff: true },
			{ selector: ".craft_profession_skill", skip: "div.cell.cell_3", diff: false },
		])
		rankingUpdate(RankingWindow.Construction, [
			{ selector: ".build_total_cp", skip: "div.cell.cell_2", diff: true },
			{ selector: ".build_fair_points", skip: "div.cell.cell_3", diff: false },
			{ selector: ".build_stage_ups", skip: "div.cell.cell_4", diff: false },
		])
		rankingUpdate(RankingWindow.Adventures, [
			{ selector: ".mpi_knockouts", skip: "div.cell.cell_2", diff: true },
			{ selector: ".mpi_total_actions", skip: "div.cell.cell_3", diff: true },
			{ selector: ".mpi_games_played", skip: "div.cell.cell_4", diff: true },
			{ selector: ".mpi_friendly_dmg", skip: "div.cell.cell_5", diff: true },
			{ selector: ".mpi_rage_quits", skip: "div.cell.cell_6", diff: false },
		])
		rankingUpdate(RankingWindow.Achievements, [
			{ selector: ".achieve_total", skip: "div.cell.cell_2", diff: true },
			{ selector: ".achieve_first", skip: "div.cell.cell_3", diff: false },
			{ selector: ".achieve_points", skip: "div.cell.cell_4", diff: true },
		])
		rankingUpdate(RankingWindow.Cities, [
			{ selector: ".town_points_sum", skip: "div.cell.cell_2", diff: true },
			{ selector: ".town_points", skip: "div.cell.cell_3", diff: true },
			{ selector: ".town_fort_points", skip: "div.cell.cell_4", diff: false },
			{ selector: ".town_member_points", skip: "div.cell.cell_5", diff: false },
			{ selector: ".town_duel_points", skip: "div.cell.cell_6", diff: false },
		])
		rankingUpdate(RankingWindow.Skills, [
			{ selector: ".skill_pointss", skip: "div.cell.cell_2", diff: true },
		])
	}
	const addDuelXpInProfiles = function () {
		try {
			PlayerProfileMain.setProfileInfo_backup =
				PlayerProfileMain.setProfileInfo_backup || PlayerProfileMain.setProfileInfo
			PlayerProfileMain.setProfileInfo = function (...args) {
				PlayerProfileMain.setProfileInfo_backup.apply(this, args)
				const char_lvl = this.resp.level
				const duel_lvl = this.resp.duelLevel
				const target = $(
					`.playerprofile-${this.playerid} .profileinfo-duellevel .profileinfo-value`
				)
				const dLvlRange = dl => ({
					min: Math.ceil(dl / 1.4 + 0.01),
					max: Math.min(450, Math.floor(dl * 1.4 - 0.01)),
				})
				const range = dLvlRange(duel_lvl)
				const getXp = lvl => Math.ceil((lvl * 10) ** (1 / 0.6))
				const getLvl = (xp, percent) => char_lvl + Math.floor((xp * (percent || 1)) ** 0.6 / 10)
				const minXp = getXp(duel_lvl - char_lvl)
				const maxXp = duel_lvl === "450" ? "<b>∞</b>" : getXp(duel_lvl + 1 - char_lvl)
				const minLvl = getLvl(minXp, 0.9)
				const maxLvl = duel_lvl === "450" ? "450" : getLvl(maxXp, 0.9)
				target.append(
					` <div class="tw2gui-iconset tw2gui-icon-question-priority-4" title="<span>${Language._(
						"duel.levels_duel",
						{
							min: range.min,
							max: range.max,
						}
					)}<br><br>${Language._("duel.levels_exp", {
						min: minXp,
						max: maxXp,
					})}<br>${Language._("duel.potion_label")} -10% ⇒ ${Language._("duel.levels_potion", {
						min: minLvl,
						max: maxLvl > minLvl ? ` - ${maxLvl}` : "",
					})}</span>" style="display:inline-block;vertical-align:top;cursor:pointer;"></div>`
				)
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.duel_xp_profile"))
		}
	}
	const addRegenTimers = function () {
		try {
			TWDB.Util.addCss(
				`#rt_container{width:16px;top:144px;left:8px;position:relative;display:flex;flex-direction:column;align-items:center}#rt_container img{cursor:help;margin:2px 0;padding:0 12px 0 6px;filter:hue-rotate(-50deg) saturate(777%)}`
			)
			const charPanel = $("#ui_character_container")
			const container = $('<div id="rt_container">')
			const createTimerImage = id => {
				const popup = new MousePopup()
				const $img = $(`<img id="${id}" src="${Images.iconRegen}" alt="sleeping">`).addMousePopup(
					popup
				)
				return { $img, popup }
			}
			const timers = [
				{
					id: "rt_health",
					maxKey: "maxHealth",
					regenKey: "healthRegen",
					currentKey: "health",
					dateKey: "healthDate",
					popup: null,
				},
				{
					id: "rt_energy",
					maxKey: "maxEnergy",
					regenKey: "energyRegen",
					currentKey: "energy",
					dateKey: "energyDate",
					popup: null,
				},
			]
			timers.forEach(timer => {
				const widget = createTimerImage(timer.id)
				timer.$img = widget.$img
				timer.popup = widget.popup
				container.append(widget.$img)
			})
			function RegenTimer(maxKey, regenKey, currentKey, dateKey, renderFn) {
				let maxVal = Character[maxKey]
				let regenVal = Character[regenKey]
				let currentVal = Character[currentKey]
				let lastUpdate = Character[dateKey]
				let perHour, secondsToFull, nextTick, percentMissing
				const recalc = () => {
					perHour = maxVal * regenVal
					const oneTick = 3600 / perHour
					const missing = maxVal - currentVal
					secondsToFull = missing * oneTick
					nextTick = oneTick - Game.getServerTime() + lastUpdate
					percentMissing = Math.round((100 / maxVal) * missing)
				}
				const checkForChanges = () => {
					if (
						maxVal !== Character[maxKey] ||
						regenVal !== Character[regenKey] ||
						currentVal !== Character[currentKey] ||
						lastUpdate !== Character[dateKey]
					) {
						maxVal = Character[maxKey]
						regenVal = Character[regenKey]
						currentVal = Character[currentKey]
						lastUpdate = Character[dateKey]
						recalc()
					}
				}
				const formatTime = v => v.formatDuration()
				recalc()
				setInterval(() => {
					checkForChanges()
					if (secondsToFull > 1) secondsToFull--
					if (nextTick > 1) nextTick--
					renderFn(
						formatTime(secondsToFull),
						perHour.toFixed(2),
						formatTime(nextTick),
						percentMissing
					)
				}, 1000)
			}
			timers.forEach(timer => {
				new RegenTimer(
					timer.maxKey,
					timer.regenKey,
					timer.currentKey,
					timer.dateKey,
					(timeStr, perHour, nextStr, percentMissing) => {
						timer.popup.setXHTML(
							s(
								`${timer.id.includes("health") ? Language._("regen.full_health") : Language._("regen.full_energy")}: <b>%1</b><br>` +
									`${Language._("regen.missing")}: <b>%4%</b>&boxv;` +
									`${Language._("regen.per_hour")}: <b>%2</b><br>` +
									`${timer.id.includes("health") ? Language._("regen.next_health") : Language._("regen.next_energy")}: <b>%3</b><br>`,
								timeStr,
								perHour,
								nextStr,
								percentMissing
							)
						)
					}
				)
			})
			charPanel.append(container)
		} catch (e) {
			ErrorModule.report(e, Language._("errors.regen_timers"))
		}
	}
	const selectForumText = function () {
		try {
			if (selectForumText.__inited) return
			selectForumText.__inited = true

			const STYLE_ID = "twdb_forum_select_text"
			const CSS_TEXT =
				`#forum,#ui_chat,div#ui_topbar>div,#ui_character_container,.tw2gui_window{-webkit-user-select:text!important;-khtml-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important}`.trim()

			const ensureStyle = doc => {
				if (!doc?.head) return
				if (doc.getElementById(STYLE_ID)) return
				const el = doc.createElement("style")
				el.id = STYLE_ID
				el.textContent = CSS_TEXT
				doc.head.appendChild(el)
			}

			const injectIntoForumIframe = iframe => {
				try {
					const doc = iframe.contentDocument || iframe.contentWindow?.document
					ensureStyle(doc)
				} catch (error) {
					ErrorModule.report(error, Language._("errors.inject_forum_iframe"))
				}
			}

			ensureStyle(document)
			document.querySelectorAll("iframe[src='forum.php']").forEach(injectIntoForumIframe)

			// `load` doesn't bubble, but it can be captured (3rd arg = true)
			document.addEventListener(
				"load",
				ev => {
					const t = ev.target
					if (t?.tagName === "IFRAME" && t.getAttribute("src") === "forum.php") {
						injectIntoForumIframe(t)
					}
				},
				true
			)
		} catch (e) {
			ErrorModule.report(e, Language._("errors.enable_night_mode"))
		}
	}
	const addNightMode = function () {
		try {
			$("#map").css({ filter: "brightness(55%)", "-webkit-filter": "brightness(55%)" })
		} catch (e) {
			ErrorModule.report(e, Language._("errors.enable_night_mode"))
		}
	}
	const removeBlinkingEvents = function () {
		try {
			const blink = setInterval(() => {
				if ($(".border.highlight").length) {
					clearInterval(blink)
					$(".border.highlight").remove()
					TWDB.Util.addCss(".border.highlight {display:none;}")
				}
			}, 3000)
		} catch (e) {
			ErrorModule.report(e, Language._("errors.remove_blinking_events"))
		}
	}
	const reworkMarketReport = function () {
		try {
			if (document.getElementsByClassName("marketplace").length > 0) {
				document.querySelectorAll('[id^="mpb_marketOfferReport"]').forEach(img => {
					const row = img.parentNode.parentNode
					const offerMsgImg = row.querySelector(".cell_8").querySelector("img")
					if (offerMsgImg !== null) {
						img.src = `${Game.cdnURL}/images/icons/warn_circle.png`
						img.height = 16
						offerMsgImg.parentNode.insertBefore(img, offerMsgImg)
					} else {
						img.remove()
					}
				})
			}
			if (Settings.get("improved_market", true)) {
				return
			} else {
				MarketWindow.Buy.updateTable_backup =
					MarketWindow.Buy.updateTable_backup || MarketWindow.Buy.updateTable
				MarketWindow.Buy.updateTable = function (...args) {
					MarketWindow.Buy.updateTable_backup.apply(this, args)
					if (Character.homeTown.town_id) {
						reworkMarketReport()
					}
				}
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.rework_market_report"))
		}
	}
	const improvedMarket = function () {
		try {
			MarketWindow.sellRights = [
				{ i: "town_new", t: Language._("market.rights_town") },
				{ i: "friends", t: Language._("market.rights_alliance") },
				{ i: "welt", t: Language._("market.rights_anyone") },
			]
			const getRights = function (page) {
				Ajax.remoteCall(
					"building_market",
					"search",
					{
						page: page,
						sort: "distance",
						visibility: 0,
					},
					function (json) {
						var results = json.msg.search_result
						for (let i = 0; i < results.length; i++) {
							var jsr = results[i]
							if (jsr.seller_name === Character.name) {
								$(`.marketSellsData_${jsr.market_offer_id} .mps_pickup`).prepend(
									`<img src="images/icons/${MarketWindow.sellRights[jsr.sell_rights].i}.png" title="${MarketWindow.sellRights[jsr.sell_rights].t}">`
								)
							}
						}
						if (page === 1 && json.msg.next) getRights(2)
					}
				)
			}
			MarketWindow.Sell.updateTable_backup =
				MarketWindow.Sell.updateTable_backup || MarketWindow.Sell.updateTable
			MarketWindow.Sell.updateTable = function (...args) {
				MarketWindow.Sell.updateTable_backup.apply(this, args)
				if (Character.homeTown.town_id) {
					getRights(1)
				}
			}
			MarketWindow.Buy.updateTable_backup = MarketWindow.Buy.updateTable
			MarketWindow.Buy.updateTable = function (data) {
				MarketWindow.Buy.updateTable_backup.call(this, data)
				if (Character.homeTown.town_id) {
					for (let i = 0; i < data.length; i++) {
						$(`#mpb_vendor_${data[i].market_offer_id}`).before(
							`<img src="images/icons/${MarketWindow.sellRights[data[i].sell_rights].i}.png" title="${MarketWindow.sellRights[data[i].sell_rights].t}">`
						)
					}
					reworkMarketReport()
				}
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.improved_market"))
		}
	}
	const improvedWhisper = function () {
		try {
			var soundBaseURL = `${Script.protocol}://${Script.folder_url}whispers/`
			var soundOptions = [
				"tw",
				"bum",
				"chime",
				"coin",
				"coin2",
				"icq",
				"qip",
				"tinkle",
				"trumpet",
				"vk",
			]
			const soundID = 9
			const eventContext = {}
			const enableKey = "whisper_improved"
			const soundKey = "beeperSound"
			let currentSound = `${soundBaseURL + soundOptions[soundID]}.mp3`
			const normalizeStoredSound = function (value) {
				if (typeof value === "string" && value !== "" && /^-?\d+$/.test(value)) {
					return parseInt(value, 10)
				}
				return value
			}
			const getStoredSound = function () {
				return normalizeStoredSound(Settings.get(soundKey, soundID))
			}
			const _setStoredSound = function (value) {
				Settings.set(soundKey, value)
			}
			Settings.get(enableKey, true)
			const updateSound = function () {
				const soundSetting = getStoredSound()
				if (typeof soundSetting === "number" && soundOptions[soundSetting]) {
					currentSound = `${soundBaseURL + soundOptions[soundSetting]}.mp3`
				} else if (typeof soundSetting === "string" && soundSetting) {
					currentSound = soundSetting
				} else {
					currentSound = `${soundBaseURL + soundOptions[soundID]}.mp3`
				}
			}
			const playSound = function () {
				try {
					new Audio(currentSound).play()
				} catch (error) {
					ErrorModule.report(error, Language._("errors.gameinject_improved_whisper_play_sound"))
				}
			}
			const enable = function () {
				EventHandler.listen("chat_tell_received", playSound, eventContext)
				if (!AudioController.play_whisper) {
					AudioController.play_whisper = AudioController.play
					AudioController.play = function (soundName, ...args) {
						if (soundName === "newmsg") return
						AudioController.play_whisper.apply(this, [soundName, ...args])
					}
				}
			}
			const disable = function () {
				EventHandler.unlistenByContext("chat_tell_received", eventContext)
				if (AudioController.play_whisper) {
					AudioController.play = AudioController.play_whisper
					delete AudioController.play_whisper
				}
			}
			updateSound()
			if (Settings.get(enableKey, true)) enable()
			window.ChatBeeper = {
				updateSound: updateSound,
				play: playSound,
				enable: enable,
				disable: disable,
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.improved_whisper"))
		}
	}
	const jobWindowLP = function () {
		try {
			JobWindow.prototype.__twdb__initView =
				JobWindow.prototype.__twdb__initView || JobWindow.prototype.initView
			JobWindow.prototype.initView = function (...args) {
				var t = JobWindow.prototype.__twdb__initView.apply(this, args)
				if (this.job && typeof this.currSkillpoints === "number") {
					var n = `&nbsp;&nbsp;(${Language._("jobs.lp_remaining", {
						lp: this.currSkillpoints - this.job.workpoints,
					})})`
					$("div.tw2gui_inner_window_title > .textart_title", this.window.divMain).append(n)
				}
				return t
			}
		} catch (t) {
			ErrorModule.report(t, Language._("errors.job_window_lp"))
		}
	}
	const addInstantQuests = function () {
		try {
			if (!QuestEmployerView?.showQuest) return

			QuestEmployerView.showQuest_backup = QuestEmployerView.showQuest

			QuestEmployerView.showQuest = questData => {
				QuestEmployerView.showQuest_backup(questData)

				const isUnaccepted = questData.accepted === false
				const hasNoRewardOptions = !questData.questRewardsOptions

				if (isUnaccepted && hasNoRewardOptions) {
					const requirements = questData.requirements || []
					const solvedCount = requirements.filter(r => r.solved === true).length
					const allSolved = solvedCount === requirements.length

					if (allSolved) {
						const buttonArea = $(`div.quest_button_area_${questData.id}`)
						if (!buttonArea.length) return

						const finishButton = new west.gui.Button(Language._("quests.accept_finish"), () => {
							QuestWindow.acceptQuest(questData.id)

							let attempts = 0
							const checkInterval = setInterval(() => {
								const questExists = QuestLog.quests?.[questData.id]

								if (questExists) {
									clearInterval(checkInterval)
									QuestWindow.finishQuest(questData.id)
								} else if (++attempts === 20) {
									clearInterval(checkInterval)
								}
							}, 200)
						}).getMainDiv()

						buttonArea.empty().append(finishButton)
					}
				}
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.add_instant_quests"))
		}
	}
	const addColoredQuests = function () {
		try {
			const formatRequirement = (requirement, solvedClass) => {
				if (requirement.jsInfo?.metatype === "FRONTEND") {
					const key = requirement.jsInfo.key
					if (QuestLog.windows_opened[key] || QuestLog.tabs_opened[key]) {
						requirement.solved = true
					}
				}
				const infoText = requirement.info.replace(/ (\(?\d+\/\d+\)?)/g, "&nbsp;$1")
				const style = requirement.solved && !solvedClass ? "color:gray;" : ""
				return `<li class="quest_requirement ${requirement.solved && solvedClass ? solvedClass : ""}" style="${style}">- ${infoText}</li>`
			}

			const originalBuildQuestLog = QuestEmployerView.buildQuestLog
			QuestEmployerView.buildQuestLog = function (questData, ...args) {
				originalBuildQuestLog.apply(this, [questData, ...args])

				questData.open.forEach(quest => {
					const questLink = $(`#open_quest_employerlink_${quest.id}`)
					if (!questLink || !questLink.is(":visible")) return

					let solvedCount = 0
					let requirementHtml =
						'<div style="max-width: 300px; min-width: 150px;"><ul class="requirement_container">'

					quest.requirements.forEach(req => {
						if (req.solved || (req.type === "wear_changed" && Bag.getItemByItemId(req.id))) {
							solvedCount++
						} else if (!req.solved) {
							requirementHtml += formatRequirement(req)
						}
					})

					requirementHtml += "</ul></div>"
					requirementHtml += `<div style="text-align: center;">${Quest.getRewards(quest.questRewards, quest.questRewardsOptions, false)}</div>`

					const questIcon = questLink.children("img")
					if (requirementHtml.trim() !== "") questIcon.addMousePopup(requirementHtml)

					if (quest.limited?.length) {
						questIcon.after(
							$(
								'<div class="hourglass_quest" style="display: inline-block; vertical-align: middle; margin-bottom: 3px; margin-right: 2px;"></div>'
							).addMousePopup(quest.limited)
						)
					}

					if (Settings.get("colored_quest")) {
						questLink.addClass("twdb_quest_entrie")
						const totalReq = quest.requirements.length

						if (solvedCount === totalReq && quest.accepted) {
							// Solved
							questLink.css({ color: "#666", "font-style": "italic" })
						} else if (
							solvedCount === totalReq ||
							(solvedCount + 1 === totalReq && quest.duel?.isNPCDuel)
						) {
							// Can be solved
							questLink.css({ color: "#070" })
						} else if ((solvedCount / totalReq) * 100 >= 66) {
							// 66% done
							questLink.css({ color: "#b75c00" })
						}
					}
				})
			}

			TWDB.Util.addCss(".twdb_quest_entrie:hover { color: #1479A8 !important; }")
		} catch (e) {
			ErrorModule.report(e, Language._("errors.add_colored_quests"))
		}
	}
	/**
	 * Inject westforts.com import button and arm/disarm the external importer.
	 * This temporarily monkey-patches FortBattle/CemeteryWindow while armed.
	 * @returns {void}
	 */
	const importWestForts = function () {
		try {
			if (location.href.includes(".the-west.") && location.href.includes("game.php")) {
				if (!TWDB.images.westfortsIconActive || !TWDB.images.westfortsIconInactive) {
					waitForImages("westfortsIconActive", importWestForts)
					return
				}
				if (document.getElementById("westforts_js")) return
				const westfortsScript = document.createElement("script")
				westfortsScript.type = "text/javascript"
				westfortsScript.id = "westforts_js"
				westfortsScript.innerHTML = `(() => {const ICON_ACTIVE = TWDB.images.westfortsIconActive;const ICON_INACTIVE = TWDB.images.westfortsIconInactive;let scriptArmed = false;const originalFortStats = FortBattle.makeStats;const originalCemeteryTable = CemeteryWindow.showStatUpdateTable;const westfortsButton = document.createElement('div');westfortsButton.id = 'westforts_link_div';const TITLE_DEFAULT = \`<b>\${Language._("westforts.open_import")}</b>\`;const TITLE_ARMED = \`<b>\${Language._("westforts.close_import")}</b>\`;westfortsButton.title = TITLE_DEFAULT;westfortsButton.style.cssText = 'position:absolute; z-index:10; cursor:pointer; text-align:center; color:#fff; font-size:12px; padding:0px 3px 1px 9px; right:0; top:0; background:url("/images/interface/minimap/minimapbg.png") no-repeat scroll 0px -7px';westfortsButton.innerHTML = \`<img id="westforts_icon_img" src="\${ICON_INACTIVE}" /><div style="float:right;margin-left:5px;margin-top:1px;">\${Language._("westforts.button_label")}</div>\`;westfortsButton.onclick = () => {const iconImg = document.getElementById('westforts_icon_img');if (scriptArmed) {westfortsButton.style.color = '#fff';iconImg.src = ICON_INACTIVE;westfortsButton.title = TITLE_DEFAULT;scriptArmed = false;const existingScript = document.getElementById('wfScript');if (existingScript) existingScript.remove();FortBattle.makeStats = originalFortStats;CemeteryWindow.showStatUpdateTable = originalCemeteryTable;const form = document.getElementById('wfForm');if (form) form.remove();} else {if (!document.getElementById('wfScript')) {const script = document.createElement('script');script.id = 'wfScript';script.type = 'text/javascript';script.src = \`https://www.westforts.com/js/import.js?\${Date.now()}\`;document.body.appendChild(script);}westfortsButton.style.color = '#01DF00';iconImg.src = ICON_ACTIVE;westfortsButton.title = TITLE_ARMED;scriptArmed = true;}};document.body.appendChild(westfortsButton);})();`
				document.body.appendChild(westfortsScript)
			}
		} catch (e) {
			ErrorModule.report(e, Language._("errors.import_westforts"))
		}
	}
	return _self
})($)
Debugger.Snippets = Snippets


const GameInject = (function ($) {
	const _self = {}
	const save = {}
	const minimap = []
	const questlog = []
	const radialmenu = []
	const quests = []
	const _ready = false
	let timeout = null
	let interval = null
	const _position = []
	const _reportreceived = []
	_self.CharacterButton = (function (e) {
		const t = {}
		let n = 0
		let r = null
		t.add = function (t) {
			if (n === 0) {
				TWDB.Util.addCss(
					`div#twdb_characbut{width:36px;height:35px;position:absolute;left:141px;top:131px;border-bottom-left-radius:8px;background:url(${Game.cdnURL}/images/interface/character/character.png?3) no-repeat -141px -105px transparent}`
				)
				r = e('<div id="twdb_characbut" />')
				e("#ui_character_container").prepend(r)
			}
			n++
			r.css({
				height: `${10 + 26 * n}px`,
				"background-position": `-141px ${26 * n - 131}px`,
			})
			var s = e(
				`<div class="char_links" style="top:${6 + (n - 1) * 26}px;left:6px;background:url(${t})no-repeat 0px 0px transparent;"/>`
			)
			s.on("mouseenter", function () {
				e(this).css("background-position", "-25px 0px")
			}).on("mouseleave", function () {
				e(this).css("background-position", "0px 0px")
			})
			r.append(s)
			return s
		}
		return t
	})($)
	_self.injectTaskJobs = function () {
		try {
			var e = TaskJob
			TaskJob = function (...args) {
				var t = e.apply(this, args)
				t.__twdb__getTitle = t.getTitle
				t.getTitle = function () {
					return `${t.__twdb__getTitle()}${Language._("misc.labor_points")} :${this.data.job_points < 0 ? "<b class='text_red'>" : "<b>"}${this.data.job_points}</b><br />`
				}
				return t
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_taskjob_template"))
		}
		try {
			if (TaskQueue.queue.length) {
				var n = $("script:contains('TaskQueue.init')")
					.text()
					.match(/TaskQueue\.init\(\s*(\[[^\]]*\])/)
				if (n.length === 2) {
					n = JSON.parse(n[1])
					TaskQueue.init(n, TaskQueue.limit)
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_job_tasks"))
		}
	}
	_self.ChatLayout = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					save["window.Chat.Layout.Tab.prototype.getMainDiv"] =
						window.Chat.Layout.Tab.prototype.getMainDiv
					window.Chat.Layout.Tab.prototype.getMainDiv = function () {
						for (let e = 0; e < t.length; e++) {
							try {
								t[e](this)
							} catch (error) {
								ErrorModule.report(error, Language._("errors.gameinject_callbacks_chat_layout"))
							}
						}
						return this.mainDiv
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.gameinject_manipulate_chat_layout"))
					window.Chat.Layout.Tab.prototype.getMainDiv =
						save["window.Chat.Layout.Tab.prototype.getMainDiv"]
				}
			}
			t.push(e)
		}
	})($)
	_self.ChatSend = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					window.Chat.Layout.Tab.prototype.twdb_send = window.Chat.Layout.Tab.prototype.send
					window.Chat.Layout.Tab.prototype.send = function () {
						for (let e = 0; e < t.length; e++) {
							try {
								t[e](this)
							} catch (error) {
								ErrorModule.report(error, Language._("errors.gameinject_callbacks_chat_send"))
							}
						}
						this.twdb_send()
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.gameinject_manipulate_chat_send"))
					window.Chat.Layout.Tab.prototype.send = window.Chat.Layout.Tab.prototype.twdb_send
				}
			}
			t.push(e)
		}
	})($)
	_self.MarketOfferTable = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					save["MarketWindow.Offer.updateTable"] = MarketWindow.Offer.updateTable
					MarketWindow.Offer.updateTable = function (e) {
						save["MarketWindow.Offer.updateTable"](e)
						for (let n = 0; n < t.length; n++) {
							try {
								t[n](e)
							} catch (error) {
								ErrorModule.report(
									error,
									Language._("errors.gameinject_callbacks_market_offer_table")
								)
							}
						}
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.gameinject_manipulate_market_offer_table"))
					MarketWindow.Offer.updateTable = save["MarketWindow.Offer.updateTable"]
				}
			}
			t.push(e)
		}
	})($)
	_self.MarketWatchlistTable = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					save["MarketWindow.Watchlist.updateTable"] = MarketWindow.Watchlist.updateTable
					MarketWindow.Watchlist.updateTable = function (e) {
						save["MarketWindow.Watchlist.updateTable"](e)
						for (let n = 0; n < t.length; n++) {
							try {
								t[n](e)
							} catch (error) {
								ErrorModule.report(
									error,
									Language._("errors.gameinject_callbacks_market_watchlist_table")
								)
							}
						}
					}
				} catch (error) {
					ErrorModule.report(
						error,
						Language._("errors.gameinject_manipulate_market_watchlist_table")
					)
					MarketWindow.Watchlist.updateTable = save["MarketWindow.Watchlist.updateTable"]
				}
			}
			t.push(e)
		}
	})($)
	_self.MarketWhatIsHotTable = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					save["MarketWindow.WhatIsHot.updateTable"] = MarketWindow.WhatIsHot.updateTable
					MarketWindow.WhatIsHot.updateTable = function (e) {
						save["MarketWindow.WhatIsHot.updateTable"](e)
						for (let n = 0; n < t.length; n++) {
							try {
								t[n](e)
							} catch (error) {
								ErrorModule.report(
									error,
									Language._("errors.gameinject_callbacks_market_what_is_hot_table")
								)
							}
						}
					}
				} catch (error) {
					ErrorModule.report(
						error,
						Language._("errors.gameinject_manipulate_market_what_is_hot_table")
					)
					MarketWindow.WhatIsHot.updateTable = save["MarketWindow.WhatIsHot.updateTable"]
				}
			}
			t.push(e)
		}
	})($)
	_self.injectSetDuelMotivation = (function (_e) {
		const t = []
		return function (e) {
			if (t.length === 0) {
				try {
					Character.twdb_setDuelMotivation = Character.setDuelMotivation
					Character.setDuelMotivation = function (e) {
						this.twdb_setDuelMotivation(e)
						for (let n = 0; n < t.length; n++) {
							try {
								t[n](e)
							} catch (error) {
								ErrorModule.report(
									error,
									Language._("errors.gameinject_callbacks_set_duel_motivation")
								)
							}
						}
					}
				} catch (error) {
					ErrorModule.report(error, Language._("errors.gameinject_manipulate_set_duel_motivation"))
					Character.setDuelMotivation = twdb_Character.setDuelMotivation
				}
			}
			t.push(e)
		}
	})($)
	_self.ItemUse = (function (_$) {
		const callbacks = []
		return function (callback) {
			if (callbacks.length === 0) {
				ItemUse.twdb = function (e, t) {
					for (let n = 0; n < callbacks.length; n++) {
						try {
							callbacks[n](e, t)
						} catch (error) {
							ErrorModule.report(error, Language._("errors.gameinject_callbacks_item_use"))
						}
					}
				}
				save["ItemUse.doIt"] = ItemUse.doIt
				try {
					const toolkit = ItemUse.doItOrigin ? "doItOrigin" : "doIt"
					const str = ItemUse[toolkit].toString()
					const pos = str.indexOf("EventHandler.signal('item_used'")
					const inject = `${str.substr(0, pos)}ItemUse.twdb(itemId,res);${str.substr(pos)}`
					// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
					eval(`ItemUse.${toolkit} = ${inject}`)
				} catch (error) {
					ItemUse.doIt = save["ItemUse.doIt"]
					ErrorModule.report(error, Language._("errors.gameinject_manipulate_item_use"))
				}
			}
			callbacks.push(callback)
		}
	})($)
	_self.injectItem = function (type, name, callback) {
		const item = `${type}Item`
		if (typeof save[item] === "undefined") {
			save[item] = tw2widget[item].prototype.getMainDiv
		}
		try {
			tw2widget[item].prototype[`TWDB${name}`] = function (e) {
				try {
					return callback(e)
				} catch (error) {
					ErrorModule.report(
						error,
						Language._("errors.gameinject_injected_function", { functionName: name })
					)
					return ""
				}
			}
		} catch (error) {
			ErrorModule.report(
				error,
				Language._("errors.gameinject_inject_function", { item: item, functionName: name })
			)
		}
		try {
			var inject = `this.TWDB${name}(this);`
			inject.replace(/ /g, "")
			var newfunction = tw2widget[item].prototype.getMainDiv
				.toString()
				.replace("return", `${inject} return`)
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`tw2widget['${item}'].prototype.getMainDiv = ${newfunction}`)
		} catch (error) {
			ErrorModule.report(
				error,
				Language._("errors.gameinject_manipulate_prototype_get_main_div", { item: item })
			)
			tw2widget[item].prototype.getMainDiv = save[item]
		}
	}
	_self.injectTrader = function (name, callback) {
		if (typeof save["west.game.shop.item.view.prototype.render"] === "undefined") {
			save["west.game.shop.item.view.prototype.render"] = west.game.shop.item.view.prototype.render
		}
		try {
			west.game.shop.item.view.prototype[`TWDB${name}`] = function (e) {
				try {
					return callback(e)
				} catch (error) {
					ErrorModule.report(
						error,
						Language._("errors.gameinject_callback_inject_trader", { functionName: name })
					)
					return ""
				}
			}
		} catch (error) {
			ErrorModule.report(
				error,
				Language._("errors.gameinject_inject_trader_callback", { functionName: name })
			)
		}
		try {
			var str = west.game.shop.item.view.prototype.render.toString()
			var inject = `window.setTimeout(function() {$item.append(that.TWDB${name}(model.getItemData()))}, 100);`
			inject.replace(/ /g, "")
			var newfunction = str.replace("return $item", `${inject} return $item`)
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`west.game.shop.item.view.prototype.render = ${newfunction}`)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_shop_item_render"))
			west.game.shop.item.view.prototype.render = save["west.game.shop.item.view.prototype.render"]
		}
	}
	_self.injectMarket = function (name, callback) {
		if (typeof save.MarketWindow === "undefined") {
			save.MarketWindow = MarketWindow.getClearName.toString()
		}
		try {
			MarketWindow[`TWDB${name}`] = function (e) {
				try {
					return callback(e)
				} catch (error) {
					ErrorModule.report(
						error,
						Language._("errors.gameinject_injected_market_window_function", {
							functionName: name,
						})
					)
				}
				return ""
			}
		} catch (error) {
			ErrorModule.report(
				error,
				Language._("errors.gameinject_inject_market_window_function", { functionName: name })
			)
		}
		try {
			var str = MarketWindow.getClearName.toString()
			var inject = `this.TWDB${name}(obj.item_id)`
			inject.replace(/ /g, "")
			var newfunction = ""
			while (str.indexOf("return") !== -1) {
				var pos = str.indexOf("return")
				newfunction += `${str.slice(0, pos + 6)} ${inject} + String(`
				str = str.substr(pos + 7)
				pos = str.indexOf(";")
				newfunction += `${str.slice(0, pos)});`
				str = str.substr(pos + 1)
			}
			newfunction += str
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`MarketWindow.getClearName = ${newfunction}`)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_market_get_clear_name"))
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`MarketWindow.getClearName = ${save.MarketWindow}`)
		}
	}
	_self.injectGetBids = function () {
		try {
			MarketWindow.twdb_showTab2 = MarketWindow.twdb_showTab2 || MarketWindow.showTab
			MarketWindow.showTab = function (e, ...args) {
				if (e !== "sell" && e !== "marketmap") TWDB.ClothCalc.getBids()
				MarketWindow.twdb_showTab2.apply(this, [e, ...args])
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_market_show_tab_2"))
		}
	}
	_self.addTabOnMessagesWindow = function (name, shortname, callback) {
		if (typeof save.MessagesWindowOpen === "undefined") {
			save.MessagesWindowOpen = MessagesWindow.open.toString()
			save.MessagesWindowTab = MessagesWindow.showTab.toString()
		}
		try {
			var inject = `MessagesWindow.window.addTab('${name}', '${shortname}', tabclick).appendToContentPane($('<div class="messages-${shortname}"/>'));`
			var newfunction = MessagesWindow.open
				.toString()
				.replace(/MessagesWindow.Telegram.DOM/g, `${inject}MessagesWindow.Telegram.DOM`)
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`(function ($) {MessagesWindow.open = ${newfunction}})(jQuery);`)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_messages_window_open"))
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`(function ($) {MessagesWindow.open = ${save.MessagesWindowOpen}})(jQuery);`)
		}
		try {
			MessagesWindow[`TWDB-${shortname}`] = function () {
				callback()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_add_show_tab_messages_window"))
		}
		try {
			var inject2 = `case '${shortname}':MessagesWindow['TWDB-${shortname}']();break;`
			var newfunction2 = MessagesWindow.showTab
				.toString()
				.replace(/switch(\s)*\(id\)(\s)*{/g, `switch (id) { ${inject2}`)
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`(function ($) {MessagesWindow.showTab = ${newfunction2}})(jQuery);`)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_messages_window_show_tab"))
			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(`(function ($) {MessagesWindow.showTab = ${save.MessagesWindowTab}})(jQuery);`)
		}
	}
	_self.addTabOnMarketWindow = function (tabName, tabId, tabCallback) {
		const switchMarketTab = function (_event, tabId) {
			if (!MarketWindow.window) return
			MarketWindow.window
				.activateTab(tabId)
				.$("div.tw2gui_window_content_pane > *", MarketWindow.DOM)
				.each(function (_event, tabElement) {
					if ($(tabElement).hasClass(`marketplace-${tabId}`)) {
						$(tabElement).children().fadeIn()
						$(tabElement).show()
					} else {
						$(tabElement).children().fadeOut()
						$(tabElement).hide()
					}
				})
			MarketWindow[`TWDB-${tabId}`]()
		}
		try {
			MarketWindow.twdb_open = MarketWindow.twdb_open || MarketWindow.open
			MarketWindow.open = function (...args) {
				this.twdb_open.apply(this, args)
				MarketWindow.window
					.addTab(tabName, tabId, switchMarketTab)
					.appendToContentPane($(`<div class="marketplace-${tabId}"/>`))
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_market_window_open"))
		}
		try {
			MarketWindow[`TWDB-${tabId}`] = function () {
				tabCallback()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_add_show_tab_market_window"))
		}
		try {
			MarketWindow.twdb_showTab = MarketWindow.twdb_showTab || MarketWindow.showTab
			MarketWindow.showTab = function (...args) {
				MarketWindow.window.setSize(748, 471).removeClass("premium-buy")
				this.twdb_showTab.apply(this, args)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_market_window_show_tab_1"))
		}
	}
	const waitForMinimap = function (_e) {
		if (interval) {
			window.clearInterval(timeout)
			window.clearInterval(interval)
		}
		const checkMinimapReady = function () {
			try {
				if (
					!MinimapWindow.window ||
					$(MinimapWindow.window.divMain).find(".mmap_jobs").length === 0
				) {
					return
				}
				if ($(MinimapWindow.window).find(".loader").is(":visible")) {
					return
				}
				window.clearInterval(timeout)
				window.clearInterval(interval)
				interval = null
				timeout = null
				for (let callbackIndex = 0; callbackIndex < minimap.length; callbackIndex++) {
					try {
						minimap[callbackIndex]()
					} catch (error) {
						ErrorModule.report(error, Language._("errors.gameinject_minimap_window_inject"))
					}
				}
			} catch (error) {
				ErrorModule.report(error, Language._("errors.gameinject_check_minimap_ready"))
			}
		}
		timeout = setInterval(function () {
			window.clearInterval(interval)
			window.clearInterval(timeout)
			interval = null
			timeout = null
		}, 3e5)
		interval = setInterval(function () {
			checkMinimapReady()
		}, 200)
	}
	_self.injectMinimap = function (e) {
		try {
			if (!MinimapWindow._open) {
				MinimapWindow._open = MinimapWindow.open
				MinimapWindow.open = function (e) {
					try {
						MinimapWindow._open(e)
						waitForMinimap()
					} catch (error) {
						ErrorModule.report(error, Language._("errors.gameinject_minimap_window_open"))
					}
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_minimap_window_open"))
		}
		try {
			if (!MinimapWindow._refreshWindow) {
				MinimapWindow._refreshWindow = MinimapWindow.refreshWindow
				MinimapWindow.refreshWindow = function () {
					try {
						MinimapWindow._refreshWindow()
						window.setTimeout(function () {
							waitForMinimap()
						}, 2500)
					} catch (error) {
						ErrorModule.report(error, Language._("errors.gameinject_minimap_window_refresh"))
					}
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_minimap_window_refresh"))
		}
		minimap.push(function () {
			e()
		})
	}
	_self.injectRadialmenu = function (e) {
		try {
			if (!window.GameMap.Radialmenu.prototype._open) {
				window.GameMap.Radialmenu.prototype._open = window.GameMap.Radialmenu.prototype.open
				window.GameMap.Radialmenu.prototype.open = function (e) {
					try {
						this._open(e)
						for (let t = 0; t < radialmenu.length; t++) {
							radialmenu[t](this)
						}
					} catch (error) {
						ErrorModule.report(error, Language._("errors.gameinject_radialmenu_open"))
					}
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_radialmenu_open"))
		}
		radialmenu.push(function (t) {
			e(t)
		})
	}
	_self.injectQuestLog = function (e) {
		try {
			if (!QuestEmployerView._buildQuestLog) {
				QuestEmployerView._buildQuestLog = QuestEmployerView.buildQuestLog
				QuestEmployerView.buildQuestLog = function (e) {
					try {
						QuestEmployerView._buildQuestLog(e)
						for (let t = 0; t < questlog.length; t++) {
							questlog[t](e)
						}
					} catch (error) {
						ErrorModule.report(
							error,
							Language._("errors.gameinject_quest_employer_view_build_quest_log")
						)
					}
				}
			}
			questlog.push(function (t) {
				e(t)
			})
		} catch (error) {
			ErrorModule.report(
				error,
				Language._("errors.gameinject_manipulate_quest_employer_view_build_quest_log")
			)
		}
	}
	_self.injectQuest = function (e) {
		try {
			if (!Quest.prototype._render) {
				Quest.prototype._render = Quest.render
				Quest.prototype.render = function () {
					try {
						this._render()
						for (let e = 0; e < quests.length; e++) {
							quests[e](this)
						}
					} catch (error) {
						ErrorModule.report(error, Language._("errors.gameinject_quest_render"))
					}
				}
			}
			quests.push(function (t) {
				e(t)
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.gameinject_manipulate_quest_render"))
		}
	}
	_self.injectInventoryAddItemsPinItems = function () {
		try {
			Inventory.__CCPI__addItems = Inventory.__CCPI__addItems || Inventory.addItems
			Inventory.addItems = function (...args) {
				const [category, isPinned] = args
				Inventory.__CCPI__addItems.apply(this, args)
				if (!$("#CC_pin_items").length) {
					Inventory.DOM.children(".actions").append(
						$('<div id="CC_pin_items" class="tw2gui_iconbutton" />')
							.attr({
								title: Language._("misc.pin_toggle_tooltip"),
							})
							.toggleClass("pinact", TWDB.Settings.itemPinningMode === 1)
					)
				}
				$("#CC_pin_items")
					.off("click")
					.click(function () {
						TWDB.Settings.itemPinningMode ^= true
						$(this).toggleClass("pinact", TWDB.Settings.itemPinningMode === 1)
						Inventory.addItems(category, isPinned)
					})
				if ((category || Inventory.defaultCategory) === "new") {
					$.each(
						(TWDB.Settings.get("pinnedItems") || []).slice().reverse(),
						function (_unusedIndex, itemId) {
							const item = Bag.getItemByItemId(itemId)
							if (item) Inventory.addItemDivToInv(item, true)
						}
					)
				}
			}
			TWDB.Util.addCss(
				`div#CC_pin_items{background-image:url("${Images.pinItems}");background-position:top;width:34px;height:36px;position:absolute;left:0!important}div#CC_pin_items.pinact{background-position:bottom}div.actions:has(.bag_resize) div#CC_pin_items{left:34px!important;position:absolute!important}`,
				"pinning"
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.inventory_additems_pin"))
		}
	}
	_self.injectInventoryAddItemDivToInvPinItems = function () {
		try {
			Inventory.__CCPI__addItemDivToInv =
				Inventory.__CCPI__addItemDivToInv || Inventory.addItemDivToInv
			Inventory.addItemDivToInv = function (...args) {
				const [item, isPinned] = args
				if (!TWDB.Settings.itemPinningMode && !isPinned)
					Inventory.__CCPI__addItemDivToInv.apply(this, args)
				else {
					const pinnedItems = TWDB.Settings.get("pinnedItems") || []
					const itemId = item.getId()
					const itemDiv = $("<div>").append(item.getMainDiv().data("itemId", item.getId()))
					itemDiv
						.find("img")
						.off("click")
						.click(
							TWDB.Settings.itemPinningMode
								? function (_e) {
										const pinnedIndex = pinnedItems.indexOf(itemId)
										if (pinnedIndex < 0) {
											if (pinnedItems.length >= Inventory.latestSize) return
											pinnedItems.push(itemId)
										} else pinnedItems.splice(pinnedIndex, 1)
										$(this).parent().parent().toggleClass("opacity05")
										TWDB.Settings.set("pinnedItems", pinnedItems)
									}
								: function (clickEvent) {
										Inventory.clickHandler(item.getId(), clickEvent)
									}
						)
					if (TWDB.Settings.itemPinningMode)
						itemDiv.addClass(pinnedItems.indexOf(itemId) < 0 ? "opacity05" : "")
					else
						itemDiv
							.find("img")
							.setDraggable(Inventory.announceDragStart, Inventory.announceDragStop)
					if (isPinned) {
						itemDiv.addClass("pinned").prependTo($("#bag", Inventory.DOM))
						$("#bag > div:empty", Inventory.DOM).remove()
						if ($("#bag > div").length > Inventory.latestSize)
							$("#bag > div:not(.pinned):first", Inventory.DOM).detach()
					} else itemDiv.appendTo($("#bag", Inventory.DOM))
				}
			}
			TWDB.Util.addCss(
				`#bag>.pinned>.item{background:rgba(134,93,39,0.4) url("${Images.pinMini}") -1px -1px no-repeat;border-radius:4px;-webkit-box-shadow:inset 0 0 2px 1px #852;-moz-box-shadow:inset 0 0 2px 1px #852;box-shadow:inset 0 0 2px 1px #852}#bag>.pinned>.item span.count{bottom:-1px;left:1px}#bag>.pinned>.item span.usable{right:-1px}#bag>.pinned>.item span.item_level{opacity:0.4;top:1px;left:initial;right:1px;background-color:rgba(0,0,0,0)}#bag>.pinned>.item span.cooldown{top:2px;left:15px}`,
				"pinning"
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.inventory_additemdiv_pin"))
		}
	}
	_self.injectTelegramWindowAppendTelegramDisplaySource = function () {
		try {
			TelegramWindow.__CCDTS__appendTelegram =
				TelegramWindow.__CCDTS__appendTelegram || TelegramWindow.appendTelegram
			TelegramWindow.appendTelegram = function (...args) {
				TelegramWindow.__CCDTS__appendTelegram.apply(this, args)
				const [msgData, t] = args
				const contentPane = t.contentPane instanceof jQuery ? t.contentPane[0] : t.contentPane
				if (!contentPane) return
				const telegramHeads = contentPane.querySelectorAll(".telegram-head")
				if (telegramHeads.length === 0) return
				const lastHead = telegramHeads[telegramHeads.length - 1]
				const authorEl = lastHead.querySelector(".author")
				if (!authorEl) return
				Object.assign(authorEl.style, {
					left: "81px",
					width: "140px",
					background: "url(/images/window/messages/post-head.jpg) -16px 0",
				})
				const sourceBtn = document.createElement("div")
				sourceBtn.className = "telegram-source"
				sourceBtn.title = Language._("misc.telegram_toggle_tooltip")
				const innerDiv = document.createElement("div")
				innerDiv.textContent = "BB"
				sourceBtn.appendChild(innerDiv)
				sourceBtn.addEventListener("click", function () {
					const isActive = sourceBtn.classList.toggle("active")
					const postEl = lastHead.nextElementSibling
					if (!postEl) return
					if (isActive) {
						// Convert HTML to BBCode-like format
						const rawText = msgData.text
							.replace(/<(\/?(b|i|u|del))>/g, "[$1]")
							.replace(
								/<a href="[^"]+PlayerProfileWindow[^"]+">([^<]+)<\/a>/g,
								"[player]$1[/player]"
							)
							.replace(/<a href="[^"]+TownWindow[^"]+">([^<]+)<\/a>/g, "[town]$1[/town]")
							.replace(/<a href="[^"]+FortWindow[^"]+">([^<]+)<\/a>/g, "[fort]$1[/fort]")
							.replace(
								/<a href="[^"]+AllianceWindow[^"]+">([^<]+)<\/a>/g,
								"[alliance]$1[/alliance]"
							)
							.replace(
								/<a class="external_link" href="[^=]+=redirect[^=]+=([^"]+)" target="_blank">([^<]+)<\/a>/g,
								(_, url, text) => `[url=${decodeURIComponent(url)}]${text}[/url]`
							)
							.replace(
								/<a class="public_report_link" href="[^"]+ReportWindow\.open\((\d+), '([0-9a-f]+)'\);">([^<]+)<\/a>/g,
								(_, id, hash, text) =>
									`[report=${id}${hash}]${text.replace(/^\[|\]$/g, "")}[/report]`
							)
						postEl.innerHTML = rawText
					} else {
						postEl.innerHTML = Game.TextHandler.parse(msgData.text)
					}
				})
				authorEl.parentNode.insertBefore(sourceBtn, authorEl)
			}
			if (!document.getElementById("telegram-source-style")) {
				const styleEl = document.createElement("style")
				styleEl.id = "telegram-source-style"
				styleEl.textContent = `.telegram-source {position: absolute; width: 24px; height: 24px; cursor: pointer; background: url(/images/window/messages/icons.png) 72px -3px; left: 52px;}.telegram-source div {display: inline-block; width: 14px; height: 11px; color: white; background: #523F30; font-size: 10px; margin: 4px; padding: 0 0 5px 2px; line-height: 16px; font-family: Impact, sans-serif; font-weight: 300;}.telegram-source.active div {background: blue;}`
				document.head.appendChild(styleEl)
			}
		} catch (err) {
			ErrorModule.report(
				err,
				Language._("errors.telegram_append", "Error manipulating TelegramWindow.appendTelegram")
			)
		}
	}
	_self.injectWanderingTraderSellDialog = function () {
		try {
			west.window.shop.view.__proto__.__twdb__showSellDialog =
				west.window.shop.view.__proto__.showSellDialog
			west.window.shop.view.__proto__.showSellDialog = function (e, ...args) {
				var t = this.getController(),
					n = Bag.getItemByItemId(e),
					r = n.count,
					i,
					s
				this.__twdb__showSellDialog.apply(this, [e, ...args])
				if (r < 3) {
					return
				}
				i = $("div.tw2gui_dialog").has(`div.textart_title:contains(${n.getName()})`)
				if (i.length === 1) {
					r--
					s = `Max-1 (${r}x = $ ${r * n.getSellPrice()})`
					i.children("div.tw2gui_dialog_actions").prepend(
						new west.gui.Button(
							s,
							function () {
								t.requestSell({ inv_id: n.inv_id, count: r })
								i.find("div.tw2gui_button").last().click()
							}.bind(this)
						).getMainDiv()
					)
				}
			}
		} catch (e) {
			ErrorModule.report(e, "manipulate .showSellDialog (wandering trader - sell all but one)")
		}
	}
	_self.MenuButton = function (image, title, onclick) {
		var onClick = onclick || function () {}
		var $obj = $(`<div class="menulink" title="${title}">`).css({
			"background-image": `url(${image})`,
			"background-repeat": "no-repeat",
			"background-position": "0px 0px",
		})
		var button = {
			obj: $obj,
			setOnClick: function (cb) {
				onClick = cb
			},
		}
		function clicked(e) {
			if (onClick) onClick(button, e)
		}
		function mouseIn() {
			$obj.css("background-position", "-25px 0px")
		}
		function mouseOut() {
			$obj.css("background-position", "0px 0px")
		}
		$obj.on("mouseenter", mouseIn).on("mouseleave", mouseOut).on("click", clicked)
		$("#TWDB_ClothCalc_menubuttons").append($obj)
		return button
	}
	_self.patchItemWidget = function () {
		try {
			if (typeof tw2widget === "undefined" || typeof tw2widget.Item === "undefined") {
				return
			}
			// Patch createItemElement to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.createItemElement"] === "undefined") {
				save["tw2widget.Item.prototype.createItemElement"] =
					tw2widget.Item.prototype.createItemElement
			}
			tw2widget.Item.prototype.createItemElement = function () {
				if (!this.obj) {
					console.error("ItemWidget: obj is undefined, cannot create element")
					this.divMain = $(
						'<div class="item error" style="width:40px;height:40px;background:#f00;border:1px solid #000;" title="Item data missing"></div>'
					)
					return
				}
				return save["tw2widget.Item.prototype.createItemElement"].call(this)
			}
			// Patch getId to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.getId"] === "undefined") {
				save["tw2widget.Item.prototype.getId"] = tw2widget.Item.prototype.getId
			}
			tw2widget.Item.prototype.getId = function () {
				if (!this.obj) return null
				return save["tw2widget.Item.prototype.getId"].call(this)
			}
			// Patch getItemLevel to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.getItemLevel"] === "undefined") {
				save["tw2widget.Item.prototype.getItemLevel"] = tw2widget.Item.prototype.getItemLevel
			}
			tw2widget.Item.prototype.getItemLevel = function () {
				if (!this.obj) return 0
				return save["tw2widget.Item.prototype.getItemLevel"].call(this)
			}
			// Patch getName to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.getName"] === "undefined") {
				save["tw2widget.Item.prototype.getName"] = tw2widget.Item.prototype.getName
			}
			tw2widget.Item.prototype.getName = function () {
				if (!this.obj) return ""
				return save["tw2widget.Item.prototype.getName"].call(this)
			}
			// Patch isUsable to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.isUsable"] === "undefined") {
				save["tw2widget.Item.prototype.isUsable"] = tw2widget.Item.prototype.isUsable
			}
			tw2widget.Item.prototype.isUsable = function () {
				if (!this.obj) return false
				return save["tw2widget.Item.prototype.isUsable"].call(this)
			}
			// Patch isUpgradeable to handle undefined this.obj
			if (typeof save["tw2widget.Item.prototype.isUpgradeable"] === "undefined") {
				save["tw2widget.Item.prototype.isUpgradeable"] = tw2widget.Item.prototype.isUpgradeable
			}
			tw2widget.Item.prototype.isUpgradeable = function () {
				if (!this.obj) return false
				return save["tw2widget.Item.prototype.isUpgradeable"].call(this)
			}
		} catch (error) {
			ErrorModule.report(error, "Error patching tw2widget.Item prototype")
		}
	}
	return _self
})($)
Debugger.GameInject = GameInject


const Quests = (function (_e) {
	const questsApi = {}
	let readyState = {}
	const initializeQuestsModule = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("quest_cancel", true)) {
				injectQuestCancelDialog()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.quests_initialize"))
		}
	}
	readyState = Loader.add("Quests", "tw-db Quests", initializeQuestsModule, {
		Settings: true,
	})
	const injectQuestCancelDialog = function () {
		try {
			var originalCancelQuest = QuestWindow.cancelQuest
			QuestWindow.cancelQuest = function (questId) {
				new west.gui.Dialog(Language._("quests.cancel_title"), Language._("quests.cancel_message"))
					.setIcon(west.gui.Dialog.SYS_QUESTION)
					.setModal(true, false, {
						bg: `${Game.cdnURL}/images/curtain_bg.png`,
						opacity: 0.4,
					})
					.addButton(Language._("common.yes"), function () {
						originalCancelQuest(questId)
					})
					.addButton(Language._("common.no"), function () {})
					.show()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.quests_inject_cancel_dialog"))
		}
	}
	return questsApi
})($)
Debugger.Quests = Quests


const DuelMotivation = (function (e) {
	const duelApi = {}
	let readyState = {}
	let motivationBar = null
	let warningBar = null
	let lastProtection = null
	let lastMotivation = null
	let protectionTimer = 0
	let protectionTooltip = ""
	let timerInterval = 0
	let protectionMethod = ""
	let isEarlyProtection = false
	const initializeDuelMotivation = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (!Settings.get("duel_motivation", false)) {
				readyState.ready = true
				return
			}
			if (Character.setDuelProtection.toString().search("duelprotection_changed") === -1) {
				Character.twdb_setDuelProtection = Character.setDuelProtection
				Character.setDuelProtection = function (protectionValue, ...args) {
					if (protectionValue === 0) {
						protectionValue = 1
					}
					var hasChanged = protectionValue !== Character.duelProtection
					Character.twdb_setDuelProtection.apply(this, [protectionValue, ...args])
					if (hasChanged) {
						EventHandler.signal("duelprotection_changed", [])
					}
				}
			} else if (TWDB.script.isDev()) {
				console.log(Language._("duel.protection_changed"))
				new UserMessage(Language._("duel.protection_changed")).show()
			}
			TWDB.Util.addCss(
				`div#ui_character_container .twdb_charcont_ext{background-image:${e("#ui_character_container").css("background-image")};background-repeat:no-repeat;background-position:bottom left;width:143px;height:15px;position:absolute;left:0;top:173px;padding-top:2px}div#ui_character_container #duelmot_bar{background-image:url(${TWDB.images.duelMotBar});background-repeat:no-repeat;background-position:0 -26px;top:2px;left:3px;height:13px;width:137px;position:absolute;color:#FFF;text-align:center;font-size:8pt;line-height:12px;font-weight:bold;text-shadow:1px 0 1px #000,-1px 0 1px #000}div#ui_character_container .duelmot_ko{background-position:0 -13px!important}div#ui_character_container .duelmot_protect{background-position:0 0!important}div#ui_character_container .duelmot_warn{background-position:0 0;top:2px;left:3px;opacity:0}div#ui_character_container .duelmot_dim{opacity:0.6}`,
				"duelmot"
			)
			isEarlyProtection = Game.duelProtectionEarly === Game.duelProtectionHours
			createDuelMotivationUI()
			EventHandler.listen("duelprotection_changed", function () {
				updateDuelProtection()
			})
			EventHandler.listen("duelmotivation_changed", function () {
				updateDuelMotivation()
			})
			updateDuelProtection()
			updateDuelMotivation(true)
			if (Character.homeTown.town_id !== 0) {
				Ajax.remoteCallMode(
					"building_saloon",
					"get_data",
					{ town_id: Character.homeTown.town_id },
					function (response) {
						if (response.error) {
							return new UserMessage(response.msg).show()
						}
						Character.setDuelMotivation(response.motivation)
					}
				)
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_initialize"))
		}
	}
	const createDuelMotivationUI = function () {
		try {
			e("#ui_character_container").css({
				"background-repeat": "no-repeat",
				height: "191px",
			})
			e(".energy_add").css({ top: "161px" })
			var container = e('<div class="twdb_charcont_ext" />').insertBefore(".energy_bar")
			motivationBar = e('<div id="duelmot_bar" class="duelmot_dim" />').appendTo(container)
			warningBar = e('<div class="status_bar duelmot_warn" />').appendTo(container)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_create_ui"))
		}
	}
	const updateDuelMotivationDisplay = function (text, tooltip, cssClass, animate, callback) {
		try {
			if (text === undefined) {
				text = ""
			}
			if (tooltip === undefined) {
				tooltip = false
			}
			if (cssClass === undefined) {
				cssClass = false
			}
			if (animate === undefined) {
				animate = false
			}
			if (!animate) {
				if (typeof cssClass === "string") {
					motivationBar.attr("class", cssClass)
				}
				motivationBar.text(text)
				if (typeof tooltip === "string") {
					warningBar.addMousePopup(tooltip)
				}
			} else {
				warningBar.fadeTo(400, 1, function () {
					updateDuelMotivationDisplay(text, tooltip, cssClass, false)
					if (callback) {
						callback()
					}
					warningBar.fadeTo(400, 0)
				})
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_update_display"))
		}
	}
	const updateDuelProtection = function () {
		try {
			if (lastProtection === Character.duelProtection) {
				return
			}
			lastProtection = Character.duelProtection
			if (Character.getDuelProtection(true) > new ServerDate().getTime()) {
				updateDuelProtectionTimer()
			} else if (protectionTimer > 0) {
				lastMotivation = 666
			} else {
				updateDuelMotivation()
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_update_protection"))
		}
	}
	const updateDuelMotivation = function (isDimmed) {
		try {
			if (lastMotivation === Character.duelMotivation || protectionTimer > 0) {
				return
			}
			lastMotivation = Character.duelMotivation
			var motivationPercent = Math.round(Character.duelMotivation * 100)
			updateDuelMotivationDisplay(
				`${motivationPercent}%`,
				`${Language._("duel.motivation")}: ${motivationPercent}%`,
				isDimmed ? "duelmot_dim" : ""
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_update_motivation"))
		}
	}
	const updateDuelProtectionTimer = function (isForced) {
		try {
			if (timerInterval) {
				w.clearInterval(timerInterval)
			}
			var currentTime = new ServerDate().getTime()
			var mandatoryProtection = Character.getMandatoryDuelProtection(true)
			var regularProtection = Character.getDuelProtection(true)
			protectionTooltip = `<div style='text-align:center;'>${Language._("duel.ko_time")}<br />`
			if (!isEarlyProtection && mandatoryProtection > currentTime && !isForced) {
				protectionTooltip += `${Language._("duel.ko_suspension", {
					time: new Date(mandatoryProtection).toLocaleString(),
				})}<br />`
				protectionTimer = parseInt((mandatoryProtection - currentTime) / 1e3, 10)
				protectionMethod = "getMandatoryDuelProtection"
			} else {
				protectionTimer = parseInt((regularProtection - currentTime) / 1e3, 10)
				protectionMethod = "getDuelProtection"
			}
			protectionTimer = Math.max(0, protectionTimer)
			protectionTooltip += `${Language._("duel.ko_protection", {
				time: new Date(regularProtection).toLocaleString(),
			})}<br />`
			updateDuelMotivationDisplay(
				protectionTimer.formatDuration(),
				protectionTooltip,
				protectionMethod === "getDuelProtection" ? "duelmot_protect" : "duelmot_ko",
				true
			)
			warningBar.addClass("koblink").click(function () {
				warningBar.removeClass("koblink").stop(true, false).css({ opacity: 0 })
			})
			timerInterval = w.setInterval(function () {
				updateDuelMotivationBar()
			}, 1e3)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_update_protection_timer"))
		}
	}
	const updateDuelMotivationBar = function () {
		try {
			if (protectionTimer > 0) {
				if (protectionTimer % 180 === 0) {
					protectionTimer =
						parseInt((Character[protectionMethod](true) - new ServerDate().getTime()) / 1e3, 10) ||
						0
				} else {
					protectionTimer--
				}
				if (protectionTimer <= 0 || lastMotivation === 666) {
					w.clearInterval(timerInterval)
					warningBar.stop(true, true)
					protectionTimer = 0
					if (protectionMethod === "getDuelProtection" || lastMotivation === 666) {
						lastMotivation = null
						return updateDuelMotivationDisplay("", "", "", true, updateDuelMotivation)
					} else {
						return updateDuelProtectionTimer(true)
					}
				}
				updateDuelMotivationDisplay(protectionTimer.formatDuration())
				if (
					protectionTimer <= 1800 &&
					warningBar.hasClass("koblink") &&
					protectionTimer % 8 === 0
				) {
					warningBar.fadeTo(500, 0.5).fadeTo(500, 0)
				}
				return
			}
			lastMotivation = null
			updateDuelMotivation()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.duel_update_motivation_bar"))
		}
	}
	readyState = Loader.add("DuelMotivation", "tw-db DuelMotivation", initializeDuelMotivation, {
		Settings: true,
	})
	return duelApi
})($)
Debugger.DuelMotivation = DuelMotivation


const Bank = (function (e) {
	const bankApi = {}
	let hasShownDepositPrompt = true
	let readyState = {}
	const initializeBank = function () {
		if (readyState.ready) {
			return
		}
		try {
			if (Settings.get("auto_deposit", false)) {
				EventHandler.listen("position_change", function () {
					handleAutoDeposit()
				})
				handleAutoDeposit()
			}
			if (Settings.get("deposit", true)) {
				addBankButton()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bank_initialize"))
		}
	}
	readyState = Loader.add("Bank", "tw-db Bank", initializeBank, { Settings: true })
	const addBankButton = function () {
		try {
			if (!Images.buttonBank) {
				waitForImages("buttonBank", addBankButton)
				return
			}
			var bankButton = GameInject.CharacterButton.add(Images.buttonBank)
			bankButton
				.click(function () {
					showDepositDialog()
				})
				.addMousePopup(Language._("banking.deposit_money"))
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bank_add_button"))
		}
	}
	const showDepositDialog = function () {
		try {
			new west.gui.Dialog(
				Language._("banking.deposit_money"),
				e(`<span class='twdb_banking'>${Language._("banking.money")}: ${w.Character.money}</span>`)
			)
				.setIcon(west.gui.Dialog.SYS_QUESTION)
				.setModal(true, false)
				.addButton(Language._("common.yes"), function () {
					performDeposit(1)
				})
				.addButton(Language._("common.no"))
				.show()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bank_show_deposit_dialog"))
		}
	}
	const handleAutoDeposit = function () {
		try {
			if (w.Character.homeTown.town_id === 0 || w.Character.money <= 10) {
				hasShownDepositPrompt = true
				return
			}
			if (
				w.Character.position.x === w.Character.homeTown.x &&
				w.Character.position.y === w.Character.homeTown.y
			) {
				if (hasShownDepositPrompt) {
					hasShownDepositPrompt = false
					new west.gui.Dialog(
						Language._("banking.deposit_money"),
						e(
							`<span class='twdb_banking'>${Language._("banking.deposit_message")}<br />${Language._("banking.money")}: ${w.Character.money}</span>`
						)
					)
						.setIcon(west.gui.Dialog.SYS_QUESTION)
						.setModal(true, false)
						.addButton(Language._("common.yes"), function () {
							hasShownDepositPrompt = true
							performDeposit(w.Character.homeTown.town_id)
						})
						.addButton(Language._("common.no"))
						.show()
				}
			} else {
				hasShownDepositPrompt = true
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bank_auto_deposit"))
		}
	}
	const performDeposit = function (townId) {
		try {
			if (w.Character.money <= 0) {
				return
			}
			w.BankWindow.townid = townId
			w.BankWindow.DOM = new west.gui.Textfield(`tb_balance_input_${w.BankWindow.townid}`)
				.setSize(10)
				.setValue(w.Character.money)
				.getMainDiv()
			w.BankWindow.Balance.add()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.bank_perform_deposit"))
		}
	}
	return bankApi
})($)
Debugger.Bank = Bank


const Market = (function (e) {
	const marketApi = {}
	let marketMapContainer = false
	let townDataMap = {}
	let readyState = {}
	const initializeMarket = function () {
		if (readyState.ready) return
		try {
			if (Settings.get("market_map", false)) {
				GameInject.addTabOnMarketWindow(
					Language._("market.map_tab_title"),
					"marketmap",
					function () {
						renderMarketMap()
					}
				)
				TWDB.Util.addCss(
					`.twdb_mmap_point{width:7px;height:7px;background-color:#F00;position:absolute;border:1px solid #000;border-radius:5px}`
				)
			}
			if (Settings.get("market_reminder", true)) {
				GameInject.MarketOfferTable(function (offerData) {
					processMarketOfferList(offerData)
				})
				GameInject.MarketWatchlistTable(function (watchlistData) {
					processMarketWatchlist(watchlistData)
				})
				marketReminder.init()
			}
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_initialize"))
		}
	}
	readyState = Loader.add("Market", "tw-db Market", initializeMarket, { Settings: true })
	const processMarketOfferList = function (offerList) {
		try {
			for (var index = 0; index < offerList.length; index++) {
				var offer = offerList[index]
				var alertDiv = e('<div class="mpo_alert" />')
				e(MarketWindow.offerTable.getMainDiv())
					.children()
					.find(`.marketBidsData_${offer.market_offer_id}`)
					.append(alertDiv)
				if (!offer.isFinished) {
					alertDiv.append(createMarketReminderIcon(offer))
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_process_offer_list"))
		}
	}
	const processMarketWatchlist = function (watchlistList) {
		try {
			for (let index = 0; index < watchlistList.length; index++) {
				var watchlistItem = watchlistList[index]
				var alertDiv = e('<div class="mpo_alert" />')
				e(MarketWindow.watchlistTable.getMainDiv())
					.children()
					.find(`.marketWatchData_${watchlistItem.market_offer_id}`)
					.append(alertDiv)
				if (!watchlistItem.isFinished) {
					alertDiv.append(createMarketReminderIcon(watchlistItem))
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_process_watchlist"))
		}
	}
	const createMarketReminderIcon = function (offer) {
		try {
			var icon = e(`<img src="${Images.iconAlarm}" />`).css({
				cursor: "pointer",
			})
			icon.click(
				(function (offerData, iconElement) {
					return function () {
						marketReminder.create(offerData, iconElement)
					}
				})(offer, icon)
			)
			if (marketReminder.exists(offer.market_offer_id) === false) {
				icon.css("opacity", 0.5)
			}
			return icon
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_create_reminder_icon"))
			return e()
		}
	}
	const marketReminder = (function (e) {
		const reminderApi = {}
		let reminders = {}
		const _r = {}
		reminderApi.init = function () {
			try {
				var loadedReminders = Cache.load("marketreminder")
				if (isDefined(loadedReminders)) {
					reminders = loadedReminders
				}
				for (const reminderId in reminders) {
					scheduleReminder(reminderId)
				}
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_reminder_init"))
			}
		}
		reminderApi.exists = function (offerId) {
			return isDefined(reminders[offerId])
		}
		const scheduleReminder = function (offerId) {
			try {
				var reminder = reminders[offerId],
					delay = Math.max(reminder.ends * 1e3 - Date.now() - reminder.reminder * 60 * 1e3, 100)
				reminder.timer = setTimeout(
					(function (id) {
						return function () {
							triggerReminder(id)
						}
					})(offerId),
					delay
				)
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_schedule_reminder"))
			}
		}
		const saveReminder = function (offer, textfield, iconElement) {
			try {
				var minutes = parseInt(textfield.getValue(), 10)
				if (Number.isNaN(minutes) || minutes < 1) {
					reminderApi.create(offer, iconElement)
					return
				}
				if (Date.now() / 1e3 + minutes * 60 >= offer.auction_end_date) {
					new UserMessage(Language._("market.reminder_late")).show()
					reminderApi.create(offer, iconElement)
					return
				}
				if (reminderApi.exists(offer.market_offer_id)) {
					clearTimeout(reminders[offer.market_offer_id].timer)
					delete reminders[offer.market_offer_id].timer
				}
				reminders[offer.market_offer_id] = {
					ends: offer.auction_end_date,
					reminder: minutes,
					id: offer.market_offer_id,
					item: offer.item_id,
				}
				Cache.save("marketreminder", reminders)
				scheduleReminder(offer.market_offer_id)
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_save_reminder"))
			}
		}
		const deleteReminder = function (offerId) {
			try {
				delete reminders[offerId]
				Cache.save("marketreminder", reminders)
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_delete_reminder"))
			}
		}
		const triggerReminder = function (offerId) {
			try {
				var reminder = reminders[offerId],
					item = ItemManager.get(reminder.item),
					notification = new OnGoingEntry()
				notification.init()
				notification.setTooltip(
					`${Language._("market.auction_label")}: ${item.name}${Language._("market.auction_ends")}: ${Number(reminder.ends - Date.now() / 1e3).getTimeString4Timestamp()}`
				)
				notification.setImage(e(`<img src="${Images.notiBell}" />`))
				WestUi.NotiBar.add(notification)
				TitleTicker.setNotifyMessage(
					`${Language._("market.auction_label")}: ${item.name}${Language._("market.auction_ends")}: ${Number(reminder.ends - Date.now() / 1e3).getTimeString4Timestamp()}`
				)
				AudioController.play(AudioController.SOUND_NEWMSG)
				deleteReminder(offerId)
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_trigger_reminder"))
			}
		}
		reminderApi.create = function (offer, iconElement) {
			try {
				var dialogContent = e("<div />").append(
						`<span style="position:relative; width:100%;display:block;">${Language._("market.auction_ends_label")}: ${offer.auction_ends_in.getTimeString4Timestamp()}</span>`
					),
					minutesField = new west.gui.Textfield("twdb_analyzer_last")
						.maxlength(4)
						.onlyNumeric()
						.setLabel(`${Language._("market.reminder_before_expiry")}: `)
						.setPlaceholder(Language._("market.reminder_minutes"))
				dialogContent.append(minutesField.getMainDiv())
				if (reminderApi.exists(offer.market_offer_id)) {
					minutesField.setValue(reminders[offer.market_offer_id].reminder)
					iconElement.css("opacity", 1)
				} else {
					iconElement.css("opacity", 0.5)
				}
				var dialog = new west.gui.Dialog(Language._("market.reminder_title"), dialogContent)
					.setIcon(west.gui.Dialog.SYS_QUESTION)
					.setModal(true, false, {
						bg: `${w.Game.cdnURL}/images/curtain_bg.png`,
						opacity: 0.4,
					})
					.addButton(Language._("common.ok"), function () {
						iconElement.css("opacity", 1)
						saveReminder(offer, minutesField, iconElement)
					})
				if (reminderApi.exists(offer.market_offer_id)) {
					dialog.addButton(Language._("common.delete"), function () {
						deleteReminder(offer.market_offer_id)
						iconElement.css("opacity", 0.5)
					})
				}
				dialog.addButton(Language._("common.cancel"), function () {}).show()
			} catch (error) {
				ErrorModule.report(error, Language._("errors.market_create_reminder"))
			}
		}
		return reminderApi
	})(e)
	const renderMarketMap = function () {
		try {
			window.MarketWindow.window.showLoader()
			window.MarketWindow.window
				.setTitle(Language._("market.map_tab_title"))
				.setSize(840, 655)
				.addClass("premium-buy")
			var leftPosition = -111,
				topPosition = -1
			var mapContainer = e(
				'<div style="position:relative;display:block;margin:10px 9px 10px 9px;width:770px;height:338px;" />'
			)
			for (let countyIndex = 1; countyIndex < 16; countyIndex++) {
				if (countyIndex === 8) {
					topPosition += 169
					leftPosition = -111
				}
				leftPosition += 110
				var countyImage = e(
					`<img style="position:absolute;border:1px solid #000;width:110px;height:169px;left:${leftPosition}px;top:${topPosition}px;" src="${Game.cdnURL}/images/map/minimap/county_${countyIndex}.jpg" />`
				)
				if (countyIndex === 4) {
					countyImage.css({ height: "114px" })
				} else {
					if (countyIndex === 11) {
						countyImage.css({ height: "114px", top: `${topPosition + 55}px` })
					} else {
						if (countyIndex === 15) {
							countyImage.css({
								height: "108px",
								width: "109px",
								left: "329px",
								top: "114px",
							})
						}
					}
				}
				mapContainer.append(countyImage)
			}
			marketMapContainer = e("<div />").append(mapContainer)
			e(MarketWindow.window.getContentPane()).find(".marketplace-marketmap").children().remove()
			e(MarketWindow.window.getContentPane())
				.find(".marketplace-marketmap")
				.append(marketMapContainer)
			townDataMap = {}
			fetchMarketBids()
			window.MarketWindow.window.hideLoader()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_render_map"))
		}
	}
	const addMarketOfferToTown = function (
		townId,
		townName,
		xCoord,
		yCoord,
		endedOffer,
		unendedOffer,
		moneyAmount
	) {
		try {
			if (!isDefined(townDataMap[townId])) {
				townDataMap[townId] = {
					name: townName,
					town_id: townId,
					x: xCoord,
					y: yCoord,
					count: 0,
					offers_end: {},
					offers_unend: {},
					money: 0,
					distance: window.GameMap.calcWayTime(window.Character.position, {
						x: xCoord,
						y: yCoord,
					}).formatDuration(),
				}
			}
			var townData = townDataMap[townId]
			if (endedOffer !== "") {
				if (!isDefined(townData.offers_end[endedOffer.item_id])) {
					townData.count++
					townData.offers_end[endedOffer.item_id] = endedOffer
				} else {
					townData.offers_end[endedOffer.item_id].count += endedOffer.count
				}
			}
			if (unendedOffer !== "") {
				if (!isDefined(townData.offers_unend[unendedOffer.item_id])) {
					townData.count++
					townData.offers_unend[unendedOffer.item_id] = unendedOffer
				} else {
					townData.offers_unend[unendedOffer.item_id].count += unendedOffer.count
				}
			}
			if (moneyAmount !== 0) {
				townData.money += moneyAmount
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_process_offer_data"))
		}
	}
	const fetchMarketBids = function () {
		try {
			Ajax.remoteCall("building_market", "fetch_bids", {}, function (response) {
				if (response.error) return new UserMessage(response.msg, UserMessage.TYPE_ERROR).show()
				const bidList = response.msg.search_result
				for (let index = 0; index < bidList.length; index++) {
					let endedOffer
					let unendedOffer
					if (
						bidList[index].auction_ends_in < 0 ||
						bidList[index].current_bid === bidList[index].max_price
					) {
						endedOffer = {
							item_id: bidList[index].item_id,
							count: parseFloat(bidList[index].item_count),
						}
						unendedOffer = ""
					} else {
						unendedOffer = {
							item_id: bidList[index].item_id,
							count: parseFloat(bidList[index].item_count),
						}
						endedOffer = ""
					}
					addMarketOfferToTown(
						bidList[index].market_town_id,
						bidList[index].market_town_name,
						bidList[index].market_town_x,
						bidList[index].market_town_y,
						endedOffer,
						unendedOffer,
						0
					)
				}
				fetchMarketOffers()
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_fetch_bids"))
		}
	}
	const fetchMarketOffers = function () {
		try {
			Ajax.remoteCall("building_market", "fetch_offers", { page: 0 }, function (response) {
				if (response.error) return new UserMessage(response.msg, UserMessage.TYPE_ERROR).show()
				const offerList = response.msg.search_result
				for (let index = 0; index < offerList.length; index++) {
					let endedOffer = ""
					if (offerList[index].auction_ends_in < 0 && !offerList[index].current_bid) {
						endedOffer = {
							item_id: offerList[index].item_id,
							count: parseFloat(offerList[index].item_count),
						}
					}
					addMarketOfferToTown(
						offerList[index].market_town_id,
						offerList[index].market_town_name,
						offerList[index].market_town_x,
						offerList[index].market_town_y,
						endedOffer,
						"",
						offerList[index].current_bid
					)
				}
				renderMarketMarkers()
			})
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_fetch_offers"))
		}
	}
	const renderMarketMarkers = function () {
		try {
			for (const townId in townDataMap) {
				var townData = townDataMap[townId]
				var popupHtml = `<div style="max-width: 305px;"><b>${townData.name}</b>${townData.money === 0 ? "" : ` ${townData.money}$`}<br/>`
				let itemCount = 0
				let offerItem
				for (const itemId in townData.offers_end) {
					itemCount++
					if (itemCount > 19) {
						popupHtml += " ... "
						break
					}
					offerItem = townData.offers_end[itemId]
					if (townData.offers_end[itemId] !== 0) {
						popupHtml += `<div class="item item_inventory"><img width="53" height="53" src="${ItemManager.get(itemId).image}" class="tw_item item_inventory_img dnd_draggable dnd_dragElem" style="margin-left:3px;margin-top:4px;"><span class="count" style="display: block;"><p>${offerItem.count}</p></span></div>`
					}
				}
				for (const unendedItemId in townData.offers_unend) {
					itemCount++
					if (itemCount > 19) {
						popupHtml += " ... "
						break
					}
					offerItem = townData.offers_unend[unendedItemId]
					if (townData.offers_unend[unendedItemId] !== 0) {
						popupHtml += `<div style="opacity:0.35" class="item item_inventory"><img width="53" height="53" src="${ItemManager.get(unendedItemId).image}" class="tw_item item_inventory_img dnd_draggable dnd_dragElem" style="margin-left:3px;margin-top:4px;"><span class="count" style="display: block;"><p>${offerItem.count}</p></span></div>`
					}
				}
				popupHtml += "</div>"
				const marker = e("<div />")
					.css({
						left: `${(townData.x / (181 * window.GameMap.tileSize)) * 770 - 5}px`,
						top: `${(townData.y / (79 * window.GameMap.tileSize)) * 338 - 5}px`,
					})
					.attr({ class: "twdb_mmap_point", id: townId, title: popupHtml })
					.click(
						(function (town) {
							return function () {
								TownWindow.open(town.x, town.y)
							}
						})(townData)
					)
				marketMapContainer.append(marker)
			}
			e(`<img src='${to_cdn("images/map/minimap/icons/miniicon_pos.png")}' />`)
				.css({
					left: `${(Character.position.x / (181 * window.GameMap.tileSize)) * 770 - 8}px`,
					top: `${(Character.position.y / (79 * window.GameMap.tileSize)) * 338 - 8}px`,
					width: "16px",
					height: "16px",
				})
				.attr({
					class: "mmap_mappoint",
					id: "mmap_icon_pos",
					title: Language._("misc.your_position"),
				})
				.appendTo(marketMapContainer)
			createMarketTownList()
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_render_markers"))
		}
	}
	const createMarketTownList = function () {
		try {
			const townList = []
			let townId
			let listHtml
			for (townId in townDataMap) {
				townList.push({ id: townId, distance: townDataMap[townId].distance })
			}
			townList.sort(function (a, b) {
				return a.distance === b.distance ? 0 : a.distance > b.distance ? 1 : -1
			})
			listHtml = ""
			for (let index = 0; index < townList.length; index++) {
				const townData = townDataMap[townList[index].id]
				listHtml += `<div><a onclick="TownWindow.open(${townData.x}, ${townData.y});">${townData.name}</a> <a title="${Language._("map.show_town_tooltip")}" onclick="GameMap.center(${townData.x}, ${townData.y})"><img src="${Game.cdnURL}/images/icons/center.png" /></a> ${Language._("misc.distance")}: ${townData.distance} <a title="${Language._("town.move_tooltip")}" onclick="TaskQueue.add(new TaskWalk(${townData.town_id},'town'))"><img src="${Game.cdnURL}/images/map/icons/instantwork.png"></a>${townData.money === 0 ? "" : ` ${townData.money}$`}<br />`
				for (const endedItemId in townData.offers_end) {
					const endedOffer = townData.offers_end[endedItemId]
					if (townData.offers_end[endedItemId] !== 0) {
						const itemPopup = new ItemPopup(ItemManager.get(endedItemId))
						listHtml += `<div class="item item_inventory" title="${itemPopup.getXHTML().escapeHTML()}"><img width="53" height="53" src="${ItemManager.get(endedItemId).image}" class="tw_item item_inventory_img dnd_draggable dnd_dragElem" style="margin-left:3px;margin-top:4px;"><span class="count" style="display: block;"><p>${endedOffer.count}</p></span></div>`
					}
				}
				for (const unendedItemId in townData.offers_unend) {
					const unendedOffer = townData.offers_unend[unendedItemId]
					if (townData.offers_unend[unendedItemId] !== 0) {
						const itemPopup2 = new ItemPopup(ItemManager.get(unendedItemId))
						listHtml += `<div style="opacity:0.35" class="item item_inventory" title="${itemPopup2.getXHTML().escapeHTML()}"><img width="53" height="53" src="${ItemManager.get(unendedItemId).image}" class="tw_item item_inventory_img dnd_draggable dnd_dragElem" style="margin-left:3px;margin-top:4px;"><span class="count" style="display: block;"><p>${unendedOffer.count}</p></span></div>`
					}
				}
				listHtml += "</div>"
				for (
					let lineBreakCount = 0;
					lineBreakCount <= (townData.count - (townData.count % 12)) / 12;
					lineBreakCount++
				) {
					listHtml += townData.count === 0 ? "<br/>" : "<br/><br/><br/><br/>"
				}
			}
			const scrollPane = new west.gui.Scrollpane()
			e(scrollPane.getMainDiv()).css({ height: "200px", "margin-left": "8px" })
			scrollPane.appendContent(listHtml)
			marketMapContainer.append(scrollPane.getMainDiv())
		} catch (error) {
			ErrorModule.report(error, Language._("errors.market_create_town_list"))
		}
		window.MarketWindow.window.hideLoader()
	}
	return marketApi
})($)
Debugger.Market = Market


const Fort = (function ($) {
	const _self = {}
	let loader = {}
	const battleStats = {}
	const initializeFortModule = function () {
		if (loader.ready) {
			return
		}
		try {
			if (Settings.get("enhanced_fort_recruitment", true)) {
				enhanceFortRecruitment()
			}
			if (Settings.get("declare_report", true)) {
				declareShowFort()
			}
			if (Settings.get("owned_forts_tab", false)) {
				ownedForts()
			}
			if (Settings.get("cemetery_critical", false)) {
				setupCemeteryCritHits()
			}
			if (Settings.get("total_dmg_battle", false)) {
				calculateTotalDamage()
			}
			if (Settings.get("battle_info_round", false)) {
				battleInfoPerRound()
			}
			if (Settings.get("total_dmg_battle", true) || Settings.get("battle_info_round", true)) {
				initBattleInfo()
			}
			loader.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_initialize"))
		}
	}
	loader = Loader.add("Fort", "tw-db Fort", initializeFortModule, { Settings: true })
	const enhanceFortRecruitment = function () {
		TWDB.Util.addCss(
			`.fortbattle .trows .status{text-align:center}.fortbattle .trows .health_points{width:90px;text-align:center;margin-left:-8px}.fortbattle .tfoot .name,.fortbattle .tfoot .town,.fortbattle .tfoot .class{width:100px;position:relative;top:10px;margin-right:10px}.fortbattle .tfoot .name{text-align:left;width:75px;margin:0 -5px 0 5px}.fort_battle_recruitlist span.tw2gui_textfield{position:relative;top:10px}.fortbattle .trows .health_points p{font-size:13px!important}.cell_3.class{margin-left:-15px;margin-right:8px}.cell_4 .sort-class{margin-left:-8px}.cell_5 .sort-status{margin-left:-20px}.cell_6 .sort-health_points{text-align:center;width:90px;display:inline-block;margin-left:-12px}.fortbattle .trows .cell_3.class{text-align:right}`
		)
		try {
			window.gradeValues = {
				TRAITOR: "-2",
				RESERVIST: "-1",
				RECRUIT: "0",
				PRIVATE: "1",
				SERGEANT: "2",
				CAPTAIN: "3",
				MAJOR_GENERAL: "4",
				GENERAL: "5",
			}
			window.gradeNames = {
				"-2": "traitor",
				"-1": "reservist",
				0: "recruit",
				1: "private",
				2: "sergeant",
				3: "captain",
				4: "major_general",
				5: "general",
			}
			window.getGradeImg = function (gradeValue, showTitle, className, officerName) {
				try {
					return `<img class="${className || ""}" src="${window.Game.cdnURL}/images/chat/servicegrade_${gradeNames[gradeValue]}.png" title="${showTitle ? window.Chat.rankTitles[gradeNames[gradeValue]].escapeHTML() : ""}${isDefined(officerName) && officerName !== "" ? ` (${officerName})` : ""}" />`
				} catch (error) {
					ErrorModule.report(error, Language._("errors.fort_get_grade_img"))
				}
			}
			if (!window.FortBattleWindow) return
			;[
				[
					"updateRecruitlist",
					true,
					[
						[
							/totalCnt\s{0,1}=\s{0,1}0;/,
							`totalCnt=0, totalCntTotal=0, gradeCountTotal={ '-2':0, '-1':0, '0':0, '1':0, '2':0, '3':0, '4':0, '5':0 };`,
						],
						[
							/gradeCount\[g\]/,
							`'<span style="font-size:15px;"><span style="font-weight:700;text-align:center;width:45px;display:inline-block;margin-left:-10px;top:2px;position:relative;color:'+(gradeCount[g]===gradeCountTotal[g]?(gradeCount[g]>0?'forestgreen':'lightslategray'):'crimson')+';">'+gradeCount[g]+'</span></span>'`,
						],
						[/\+\s{0,1}totalCnt\s{0,1}\+/, `+totalCnt+' ['+totalCntTotal+']'+`],
						[
							/if\(this\.preBattle\.isHidden\(list\[i\]\['class'\], ?'rank_' ?\+ ?priv\)\)/,
							`totalCntTotal++;gradeCountTotal[priv]++;if(this.preBattle.isHidden(list[i]['class'],'rank_'+priv,list[i].coords.x,list[i].coords.y))`,
						],
						[
							/getGradeImg\(priv, ?true, ?'recruitplayer recruitplayer-'\+ ?i\)/,
							`getGradeImg(priv,true,'recruitplayer recruitplayer-'+i,list[i].officername||'')`,
						],
						[
							/\.addColumns\(\s*\[\s*'count'\s*,\s*'name'\s*,\s*'town'\s*,\s*'rank'\s*,\s*'class'\s*,\s*'status'\s*,\s*'evaluated'\s*\]\s*\)/,
							`.addColumns(['count','name','town','rank','class','status','health_points'])`,
						],
						[
							/\.appendToThCell\(\s*'head'\s*,\s*'evaluated'\s*,[\s\S]*?\);/,
							`.appendToThCell('head','health_points','${Language._("fort.sort_by_health")}','<span class="sort sort-health_points">${Language._("misc.health_points")}</span>');`,
						],
						[
							/evaluated\s*:\s*list\[i\]\.officername\s*\|\|\s*''/,
							`health_points:'<p style="font-weight:700;color:'+((this.preBattle.battleData.fortCoords.x-list[i].coords.x==0&&this.preBattle.battleData.fortCoords.y-list[i].coords.y==0)?'rgb(0,153,0)':((Math.abs(this.preBattle.battleData.fortCoords.x-list[i].coords.x)<=500&&Math.abs(this.preBattle.battleData.fortCoords.y-list[i].coords.y)<=500)?'rgb(255,119,0)':'rgb(255,0,0)'))+'">'+(list[i].currhealth===list[i].maxhealth?format_number(list[i].maxhealth):format_number(list[i].currhealth)+'&boxv;'+format_number(list[i].maxhealth))+'</p>'`,
						],
					],
				],
				[
					"recruitListClick",
					false,
					[
						[/pp ?< ?ownPriv/, "pp<ownPriv&&ownPriv>gv.SERGEANT"],
						[
							/var hidden ?= ?function\(classKey, ?privKey\) ?{ ?return that\.preBattle\.isHidden\(classKey, ?'rank_'\+ ?privKey\); ?};/,
							`{var hidden=function(classKey,privKey,location){return that.preBattle.isHidden(classKey,'rank_'+privKey,null,null,location);};}`,
						],
						[
							/return ?{message: ?sorting, ?title: ?title};/,
							`else if(key=='health_points'){title='${Language._("fort.sort_by_health")}';sorting.append(getSortLink('${Language._("fort.sort_asc_current_health")}','>currhealth'));sorting.append(getSortLink('${Language._("fort.sort_desc_current_health")}','<currhealth'));sorting.append(getSortLink('${Language._("fort.sort_asc_max_health")}','>maxhealth'));sorting.append(getSortLink('${Language._("fort.sort_desc_max_health")}','<maxhealth'));sorting.append('<br />');sorting.append(getSortLink('${Language._("fort.sort_asc_distance")}','>distance'));sorting.append(getSortLink('${Language._("fort.sort_desc_distance")}','<distance'));sorting.append(getVisLink(hidden(null,'-3','atfort')?'${Language._("fort.show_players_at_fort")}':'${Language._("fort.hide_players_at_fort")}','atfort'));sorting.append(getVisLink(hidden(null,'-3','nearbyfort')?'${Language._("fort.show_players_near_fort")}':'${Language._("fort.hide_players_near_fort")}','nearbyfort'));sorting.append(getVisLink(hidden(null,'-3','notatfort')?'${Language._("fort.show_players_away_fort")}':'${Language._("fort.hide_players_away_fort")}','notatfort'));}return{message:sorting,title:title};`,
						],
					],
				],
			].forEach(([fn, preserve, repls]) => {
				const original = window.FortBattleWindow[fn]
				if (!original || original.__hp_patched) return
				let src = String(original)
				repls.forEach(([p, r]) => {
					src = src.replace(p, r)
				})
				const wrapped = preserve
					? `(function(){var lastStamp;return ${src}})();`
					: `(function(){return ${src}})();`
				const compiled = new Function(`return ${wrapped}`)()
				window.FortBattleWindow[fn] = function (...args) {
					const result = compiled.apply(this, args)
					if (fn === "updateRecruitlist")
						try {
							const root = this.infoareaEl?.[0]
							const th1 = TWDB.Util.query(".cell_4 .sort-class", root)
							const th2 = TWDB.Util.query(".cell_5 .sort-status", root)
							if (th1) th1.textContent = Language._("misc.category")
							if (th2)
								th2.innerHTML = `<img src="${window.Game.cdnURL}/images/chat/servicegrade_general.png" alt="${Language._("misc.rank")}" style="pointer-events:none;">`
						} catch {}
					return result
				}
				window.FortBattleWindow[fn].__hp_patched = true
				window.FortBattleWindow[fn].__hp_original = original
			})
			PreBattle.recruitSorting.currhealth = function (recruit1, recruit2, isEqual) {
				return isEqual
					? recruit1.currhealth === recruit2.currhealth
					: recruit1.currhealth < recruit2.currhealth
			}
			PreBattle.recruitSorting.maxhealth = function (recruit1, recruit2, isEqual) {
				return isEqual
					? recruit1.maxhealth === recruit2.maxhealth
					: recruit1.maxhealth < recruit2.maxhealth
			}
			PreBattle.recruitSorting.distance = function (
				_recruit1,
				_recruit2,
				_isEqual,
				_x,
				_y,
				_location
			) {}
			PreBattle.isHidden = function (classKey, rankKey, coordX, coordY, location) {
				let locationType = "notatfort"
				if (location === null) {
					const deltaX = this.battleData.fortCoords.x - coordX
					const deltaY = this.battleData.fortCoords.y - coordY
					if (deltaX === 0 && deltaY === 0) {
						locationType = "atfort"
					} else if (Math.abs(deltaX) <= 500 && Math.abs(deltaY) <= 500) {
						locationType = "nearbyfort"
					}
				} else if (location !== null) {
					locationType = location
				}
				return (
					(classKey !== undefined && this.recruitlistVisibility[classKey]) ||
					(rankKey !== undefined && this.recruitlistVisibility[rankKey]) ||
					(locationType !== undefined && this.recruitlistVisibility[locationType])
				)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_enhance_recruitment"))
		}
	}
	const declareShowFort = function () {
		try {
			ReportWindow.init_content_backup = ReportWindow.init_content
			ReportWindow.init_content = function (data) {
				ReportWindow.init_content_backup.call(this, data)
				if (data.reportType === "fortbattle" && data.reportInfo.subtype === "declare") {
					getFortID(data.reportInfo.fortname, data.report_id)
				}
			}
			function getFortID(fortName, reportId) {
				Ajax.remoteCall("fort_overview", "search_fort", { fortNames: fortName }, function (json) {
					if (json && !json.error) {
						for (const fortIndex in json) {
							var fort = json[fortIndex]
							if (fort && fort.name === fortName) {
								$(`#rp_report-${reportId} .fort_muster a:first-child`).replaceWith(
									`<a href="javascript:void(FortWindow.open(${fort.fort_id}, ${fort.fort_x}, ${fort.fort_y}));">${fort.name}</a>`
								)
								break
							}
						}
					}
				})
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_declare_show"))
		}
	}
	const ownedForts = function () {
		try {
			const data = {}
			const lang = {
				forts: Language._("fort.forts"),
				forts_owned: Language._("fort.forts_owned"),
				forts_members: Language._("fort.forts_members"),
				fort_size: Language._("fort.size"),
				fort_sizes: Language._("fort.sizes"),
			}
			$(document).on("click", ".tow_profileheader img", function () {
				var windowEl = $(this).closest(".tw2gui_window")
				var mapAttr = windowEl.find(".imagemap_cityhall").attr("onclick")
				if (!mapAttr) return
				var match = /CityhallWindow\.open\((.*)?\); return false;/.exec(mapAttr)
				if (!match) return

				var townId = parseInt(match[1], 10)
				var prop =
					this === windowEl.find('.tow_profileheader img[src*="fort_mini_icon"]').get(0)
						? "owned"
						: "members"

				if (!data[townId]) {
					Ajax.get("map", "get_minimap", {}, function (json) {
						buildData(json)
						if (data[townId]) openWindow(townId, prop)
					})
				} else {
					openWindow(townId, prop)
				}
			})

			document.styleSheets[0].insertRule(".twdb-forts-container .fortname {width:75%;}")
			document.styleSheets[0].insertRule(
				".twdb-forts-container .fortsize {width:25%;text-align:center;}"
			)
			document.styleSheets[0].insertRule(
				'.tow_profileheader img[src*="fort_mini_icon"] {cursor:pointer;}'
			)

			const buildData = function (json) {
				for (const allianceIndex in json.forts) {
					for (const fortIndex in json.forts[allianceIndex]) {
						var fort = json.forts[allianceIndex][fortIndex]
						if (!fort.fort) continue
						var owner = fort.fort.town_id
						var members = fort.townIds || []
						var fortData = {
							type: fort.fort.type,
							id: fort.fort.fort_id,
							x: fort.fort.x,
							y: fort.fort.y,
							name: fort.fort.name,
						}
						if (!data[owner]) data[owner] = { owned: [], members: [] }
						data[owner].owned.push(fortData)
						for (let k = 0; k < members.length; k++) {
							if (!data[members[k]]) data[members[k]] = { owned: [], members: [] }
							data[members[k]].members.push(fortData)
						}
					}
				}
			}

			Ajax.get("map", "get_minimap", {}, function (json) {
				buildData(json)
			})

			const openWindow = function (townId, type) {
				var fortsContainer = $('<div class="twdb-forts-container" style="height:100%"></div>')
				var table = new west.gui.Table()
				table
					.addColumn("fortname")
					.addColumn("fortsize")
					.appendToCell("head", "fortname", lang.forts)
					.appendToCell("head", "fortsize", lang.fort_size)

				var forts = data[townId][type]
				for (let i = 0; i < forts.length; i++) {
					table.appendRow()
					table
						.appendToCell(
							i,
							"fortname",
							`<div class="anti_wrap"><a onclick="GameMap.center(${forts[i].x}, ${forts[i].y})" href="#"><img class="fortOverviewIconScroll hasMousePopup" src="images/icons/center.png"></a> <a href="javascript:void(FortWindow.open(${forts[i].id},${forts[i].x},${forts[i].y}));" class="hasMousePopup">${forts[i].name}</a></div>`
						)
						.appendToCell(i, "fortsize", lang.fort_sizes[forts[i].type])
				}

				fortsContainer.html(table.getMainDiv())
				const title = type === "owned" ? lang.forts_owned : lang.forts_members
				wman
					.open(
						"twdb-forts-container",
						null,
						"twdb-forts-container noreload nocloseall nominimize dontminimize"
					)
					.setTitle(title)
					.setMiniTitle(title)
					.appendToContentPane(fortsContainer)
					.setSize(340, 360)
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_owned_forts"))
		}
	}
	/**
	 * Extend CemeteryWindow stats table with crit-hit + ghost-round columns and sortable headers.
	 * Uses string-rewrite + eval because the original UI code has no stable hooks.
	 * @returns {void}
	 */
	const setupCemeteryCritHits = function () {
		try {
			document.styleSheets[0].insertRule(
				`.cemetery .fancytable .row_head .battle_cri span {background: url("${Images.iconCritical}");height:17px;width:16px;}`
			)
			document.styleSheets[0].insertRule(
				".cemetery .fancytable .battle_cri, .cemetery .fancytable .battle_gho {width:18px;}"
			)
			document.styleSheets[0].insertRule(
				`.cemetery .fancytable .row_head .battle_gho span {background: url("${Images.iconPhantom}");height:17px;width:16px;}`
			)
			document.styleSheets[0].insertRule(
				".cemetery #battle_stat.fancytable div.battle_tow {width:60px!important;}"
			)
			var patchedInit = CemeteryWindow.showStatInit
				.toString()
				.replace(
					"$('div.cemetery-content',",
					`CemeteryWindow.table.addColumn('battle_cri',{sortBy:'crithits'}).addColumn('battle_gho',{sortBy:'playdeadcount'}).appendToThCell('head','battle_cri','${Language._("battle.critical_hits")}','&nbsp;').appendToThCell('head','battle_gho','${Language._("battle.ghost_rounds")}','&nbsp;');sortByObj.sortBy=null;$('div.cemetery-content',`
				)
			var patchedUpdate = CemeteryWindow.showStatUpdateTable
				.toString()
				.replace(
					"CemeteryWindow.table.buildRow('battlestat tw_red'",
					`tmpCells['battle_cri']=rd.charclass==1?rd.crithits:'-';tmpCells['battle_gho']=rd.charclass==0?rd.playdeadcount:'-';CemeteryWindow.table.buildRow('battlestat tw_red'`
				)
				.replace(
					"CemeteryWindow.table.buildRow('battlestat tw_blue'",
					`tmpCells['battle_cri']=rd.charclass==1?rd.crithits:'-';tmpCells['battle_gho']=rd.charclass==0?rd.playdeadcount:'-';CemeteryWindow.table.buildRow('battlestat tw_blue'`
				)
			var sortHelpers = `var sortByObj={sortBy:null,orderBy:'ASC'};var startSortDispatcher=function(ev){var sortBy='';sortBy=$(ev.target).closest('div.cell').data('sortBy');if(sortByObj.sortBy==sortBy){sortByObj.orderBy=sortByObj.orderBy=='asc'?'desc':'asc';CemeteryWindow.currentStats.reverse();}else{sortByObj.sortBy=sortBy;sortByObj.orderBy='asc';switch(sortBy){case'name':case'townname':CemeteryWindow.currentStats.sort(sortStrings(sortBy));break;case'ko_shots':CemeteryWindow.currentStats.sort(sortLength(sortBy));break;default:if($.isNumeric(CemeteryWindow.currentStats[0][sortBy])) CemeteryWindow.currentStats.sort(sortNumbers(sortBy));break;}}updatePlayerStatTable(CemeteryWindow.currentStats);};var sortLength=function(col) {return function(a,b) {return b[col].length-a[col].length;};};var sortNumbers=function(col) {return function(a,b) {return b[col]-a[col];};};var sortStrings=function(col) {return function(a,b) {return a[col].toUpperCase().replace(/[À-Ä]/g,'A').replace(/[Ò-Ö]/,'O').replace(/[Ù-Ü]/,'U').replace(/[È-Ë]/,'E')>b[col].toUpperCase().replace(/[À-Ä]/g,'A').replace(/[Ò-Ö]/,'O').replace(/[Ù-Ü]/,'U').replace(/[È-Ë]/,'E')?1:-1;};};var updatePlayerStatTable=function() {CemeteryWindow.table.clearBody();var tmpCells={};for(var i=0;i<CemeteryWindow.currentStats.length;i++) {var rd=CemeteryWindow.currentStats[i];tmpCells['battle_nam']=rd.name;tmpCells['battle_tow']=rd.townname;tmpCells['battle_shp']=rd.starthp;tmpCells['battle_ehp']=rd.finishedhp;tmpCells['battle_fla']=rd.flagholdcount;tmpCells['battle_hco']=rd.hitcount;tmpCells['battle_fco']=rd.misscount;tmpCells['battle_dco']=rd.totalcauseddamage;tmpCells['battle_ohi']=rd.takenhits;tmpCells['battle_ofa']=rd.dodgecount;tmpCells['battle_odm']=rd.takendamage;tmpCells['battle_avd']=rd.avg_damage;tmpCells['battle_okh']=rd.ko_shots.length;tmpCells['battle_onl']=rd.onlinecount;tmpCells['battle_cri']=rd.charclass==1?rd.crithits:'-';tmpCells['battle_gho']=rd.charclass==0?rd.playdeadcount:'-';CemeteryWindow.table.buildRow('battlestat '+(rd.battle_type=='defender'?'tw_blue':'tw_red'),tmpCells,addKoShotTitle(rd.ko_shots));}};var addKoShotTitle=function(koShots){return function(row){if(koShots.length){$('.battle_okh',row).attr('title',koShots.join(', '));} return row;}};`

			// biome-ignore lint/security/noGlobalEval: intentional for userscript injection
			eval(
				`(function($){CemeteryWindow.showStatInit=${patchedInit};CemeteryWindow.showStatUpdateTable=${patchedUpdate};${sortHelpers}})(jQuery);`
			)
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_setup_cemetery_crit_hits"))
		}
	}
	/**
	 * Fort battle UI: make names clickable and add a total damage field to the character sheet.
	 * @returns {void}
	 */
	const calculateTotalDamage = function () {
		if (typeof FortBattle === "undefined") return
		try {
			if (
				!FortBattle.flashShowCharacterInfo_backup &&
				typeof FortBattle.flashShowCharacterInfo === "function"
			) {
				FortBattle.flashShowCharacterInfo_backup = FortBattle.flashShowCharacterInfo
				FortBattle.flashShowCharacterInfo = function (...args) {
					FortBattle.flashShowCharacterInfo_backup.apply(FortBattle, args)
					$("div.recruitlist_name", `#fort_battle_${args[0]}_infoarea`).html(
						`<span onclick="PlayerProfileWindow.open(${args[1]});" style="cursor:pointer;">${$("div.recruitlist_name").text()}</span>`
					)
				}
			}
			if (
				!FortBattle.getCharDataSheet_backup &&
				typeof FortBattle.getCharDataSheet === "function"
			) {
				FortBattle.getCharDataSheet_backup = FortBattle.getCharDataSheet
				FortBattle.getCharDataSheet = function (data) {
					return `${FortBattle.getCharDataSheet_backup(data)}<div><img src="${Images.iconTotalDMG}" title="${Language._("battle.total_damage_tooltip")}" /> %totalDmg%</div>`
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_calculate_total_damage"))
		}
	}
	/**
	 * Fort battle UI: keep simple per-round hit/miss/gotshot/dodge counters.
	 * @returns {void}
	 */
	const battleInfoPerRound = function () {
		try {
			FortBattle.addRoundStatusMessage_backup = FortBattle.addRoundStatusMessage
			FortBattle.addRoundStatusMessage = function (fortId, queue) {
				FortBattle.addRoundStatusMessage_backup(fortId, queue)
				if (!battleStats[fortId]) {
					battleStats[fortId] = { hit: 0, missed: 0, gotshot: 0, dodge: 0 }
				}
				const stats = battleStats[fortId]
				for (let messageIndex = 0; messageIndex < queue.length; messageIndex++) {
					const msg = queue[messageIndex]
					switch (msg.action) {
						case "gotshot":
							if (msg.damage === 0) {
								stats.dodge++
							} else {
								stats.gotshot++
							}
							break
						case "shot":
							if (msg.damage === 0) {
								stats.missed++
							} else {
								stats.hit++
							}
							break
					}
				}
				if (queue.length !== 0) {
					FortBattle.showMessage(
						fortId,
						`<strong>${Language._("battle.stats_total")} | ${Language._("battle.stats_hits")}: </strong>${stats.hit}<strong> | ${Language._("battle.stats_missed")}: </strong>${stats.missed}<strong> | ${Language._("battle.stats_got_shot")}: </strong>${stats.gotshot}<strong> | ${Language._("battle.stats_dodge")}: </strong>${stats.dodge}`
					)
				}
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_battle_info_per_round"))
		}
	}
	/**
	 * Reset round counters on battle finish.
	 * @returns {void}
	 */
	const initBattleInfo = function () {
		try {
			FortBattle.addFinishMessage_backup = FortBattle.addFinishMessage
			FortBattle.addFinishMessage = function (fortId, msg) {
				FortBattle.addFinishMessage_backup(fortId, msg)
				battleStats[fortId] = { hit: 0, missed: 0, gotshot: 0, dodge: 0 }
			}
		} catch (error) {
			ErrorModule.report(error, Language._("errors.fort_init_battle_info"))
		}
	}
	return _self
})($)
Debugger.Fort = Fort


const CCstarter = (function (_e) {
	const ccStarterApi = {}
	let readyState = {}
	const initializeClothCalc = function () {
		if (readyState.ready) {
			return
		}
		try {
			ClothCalc.ready = readyState.ready
			ClothCalc.init()
			readyState.ready = true
		} catch (error) {
			ErrorModule.report(error, Language._("errors.ccstarter_initialize"))
		}
	}
	readyState = Loader.add("ClothCalc", "tw-db ClothCalc", initializeClothCalc, {})
	return ccStarterApi
})($)
Debugger.CCstarter = CCstarter


			if (
				(w.location.href.indexOf(".the-west.") !== -1 ||
					w.location.href.indexOf(".tw.innogames.") !== -1) &&
				w.location.href.indexOf("game.php") !== -1
			) {
				Loader.init()
			}
		})(jQuery)

	}
})