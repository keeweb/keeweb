if (/MSIE \d|Trident.*rv:/.test(navigator.userAgent)) {
	// eslint-disable-next-line prefer-arrow-callback
	document.addEventListener("DOMContentLoaded", function () {
		document.body.style.maxWidth = "600px";
		document.body.style.margin = "40px auto";
		document.body.style.position = "static";
		document.body.innerHTML +=
			"<p>IDS password bank does not support Internet Explorer. Please use Google Chrome instead.</p>";
	});
}
