try {
	TWDB.Updater.check("29.0", "clothcalc")
} catch (error) {
	TWDB.Error.report(error, TWDB.lang._("errors.updater_check_version"))
}
