const color_translated = '#99CC99';
const color_untranslated = '#FF9999';
const color_fuzzy = '#FFCC00';
const color_unsent = '#FFCC00';
const color_hover = '#EEF6FF';

const bg_untranslated = '#FFEEEE';
const bg_fuzzy = '#FFFFCC';

const attr_trans_id = '_translation_id';
const attr_translated = '_translated';
const attr_previous = '_previous';

var edit_window = null;
var edited_node = null;
var original_text;
var translated_text;
var linked_nodes = new Array();
var all_nodes = new Array();

var title_id = 0;
var title_insert = false;
var first_title = null;

function endEditionEvent(clickOK) {
	if (window.edited_node == null)
		return;

	var id = window.edited_node.getAttribute(attr_trans_id);
	var next_node = null;

	if (clickOK) {
		var trans = edit_window.document.getElementById('translated').value;
		var mark_fuzzy = edit_window.document.getElementById('mark_fuzzy').checked;

		translated_strings[id] = trans;

		var send_ok = false;

		var xml_http = new XMLHttpRequest();

		var encoded_source = encodeURI(source_strings[id]).replace(/&/g, '%26').replace(/\+/g, '%2B');
		var encoded_translation = encodeURI(trans).replace(/&/g, '%26').replace(/\+/g, '%2B');

		xml_http.open('POST', base_url + '/translate.php', false);
		xml_http.setRequestHeader('Content-Type',
			'application/x-www-form-urlencoded');
		xml_http.send('translate_lang=' + lang + '&translate_doc=' + doc_id +
			'&translate_string=' + id + '&translate_text=' + encoded_translation +
			'&translate_source=' + encoded_source + '&is_fuzzy=' + (mark_fuzzy ? '1' : '0'));

		edit_window.focus();

		var resp = xml_http.responseText;

		if (resp.substring(0, 7) == 'badxml ')
			edit_window.alert('The server rejected the translation because of XML ' +
				"parsing errors :\n" + xml_http.responseText.substring(3) +
				"\n" + 'Check the XML tags used in your translation.');
		else if (resp.substring(0, 7) == 'diffxml')
			edit_window.alert('The server rejected the translation because the ' +
				'XML code used in it differs from the original string.' + "\n" +
				'Check the XML tags used in your translation.');
		else if (resp.substring(0, 6) == 'interr')
			edit_window.alert('The original XML code seems corrupt. Please contact ' +
				'an administrator.' + "\n");
		else if (resp.substring(0, 2) != 'ok')
			edit_window.alert('There was an error sending the translation. Please ' +
			'retry.' + "\n" + xml_http.responseText);
		else
			send_ok = true;

		is_fuzzy[id] = mark_fuzzy;

		for (var i = 0 ; i < linked_nodes[id].length ; i++) {
			linked_nodes[id][i].innerHTML = trans;
			linked_nodes[id][i].style.border = '1px dotted ' +
				(send_ok ? color_translated : color_unsent);
			linked_nodes[id][i].style.backgroundColor = null;

			if (send_ok) {
				if (mark_fuzzy) {
					linked_nodes[id][i].style.border = '1px dotted ' + color_fuzzy;
					linked_nodes[id][i].style.backgroundColor = bg_fuzzy;
				} else {
					linked_nodes[id][i].style.border = '1px dotted ' + color_translated;
					linked_nodes[id][i].style.backgroundColor = null;
				}
			} else {
				linked_nodes[id][i].style.border = '1px dotted ' + color_unsent;
			}
		}

		if (!send_ok) {
			edit_window.focus();
			return;
		}

		if (edit_window.document.getElementById('auto_cont').checked) {
			var current_id = window.edited_node.getAttribute('_internal_id');
			while (current_id < all_nodes.length) {
				var t_id = all_nodes[current_id].getAttribute(attr_trans_id);
				if (translated_strings[t_id] == '') {
					next_node = all_nodes[current_id];
					break;
				}
				current_id++;
			}
		}

	} else {
		window.edited_node.innerHTML = translated_strings[id];
		if (window.edited_node.innerHTML == ''
			|| window.edited_node.innerText == '')
			window.edited_node.innerHTML = source_strings[id];
	}

	if (next_node) {
		window.edited_node = next_node;
		var id = next_node.getAttribute(attr_trans_id);
		window.original_text = source_strings[id];
		window.translated_text = translated_strings[id];
		window.setTimeout(edit_window.refreshAll, 0);
	} else {
		edit_window.close();
		edit_window = null;
		window.edited_node = null;
	}
}

function mouseOverEvent(e) {
	this.style.backgroundColor = color_hover;
}

function mouseOutEvent(e) {
	var id = this.getAttribute(attr_trans_id);
	if (translated_strings[id] == '') {
		this.style.backgroundColor = bg_untranslated;
	} else if (is_fuzzy[id]) {
		this.style.backgroundColor = bg_fuzzy;
	} else {
		this.style.backgroundColor = null;
	}
}

function imgMouseOutEvent(e) {
	this.style.backgroundColor = null;
}

function mouseClickEvent(e) {
	if (window.edited_node != null) {
		edit_window.focus();
		return false;
	}

	window.edited_node = this;

	var id = this.getAttribute(attr_trans_id);

	edit_window = window.open(base_url + '/shared/translate_tool.html',
		'Edit Translation', 'width=650,height=400,status=0,toolbar=0,location=0,menubar=0,directories=0,resizable=1,scrollbars=0');
	window.original_text = source_strings[id];
	window.translated_text = translated_strings[id];

	return true;
}

function imgMouseClickEvent(e) {
	var src = this.getAttribute("src");
	if (src != '.') {
		src = base_local + '/' + src;
	}
	window.open(base_url + '/res_upload.php?path=' + encodeURIComponent(src) + '&lang=' + lang,
		src, 'width=800,height=600,status=0,toolbar=0,location=0,menubar=0,directories=0,resizable=1,scrollbars=1');

	return true;
}

function setProperties(node) {
	if (node == null)
		return;

	if (node.getAttribute) { // Avoid special nodes
		if (node.getAttribute(attr_trans_id) != null) {
			var id = node.getAttribute(attr_trans_id);

			if (source_strings[id]) {
				var node_name = node.tagName.toLowerCase();

				if (node_name != "title") { // We can't touch it
					if (translated_strings[id] == '') {
						node.style.border = '1px dotted ' + color_untranslated;
						node.style.backgroundColor = bg_untranslated;
					} else if (is_fuzzy[id]) {
						node.style.border = '1px dotted ' + color_fuzzy;
						node.style.backgroundColor = bg_fuzzy;
						node.innerHTML = translated_strings[id];
					} else {
						node.style.border = '1px dotted ' + color_translated;
						node.innerHTML = translated_strings[id];
					}

					node.onmouseover = mouseOverEvent;
					node.onmouseout = mouseOutEvent;
					node.onclick = mouseClickEvent;

					node.setAttribute('_internal_id', all_nodes.length);
					all_nodes.push(node);

					if (linked_nodes[id] == null) {
						linked_nodes[id] = [ node ];
					} else {
						linked_nodes[id].push(node);
					}
				}

				if (title_id == 0 && node_name == "title") {
					title_id = id;
					title_insert = true;
				} else if (id == title_id) {
					title_insert = false;
				}

				if (first_title == null && (node_name == "h1" || node_name == "h2")) {
					first_title = node;
				}
			}
			return;
		} else if (node.tagName.toLowerCase() == "img") {
			node.style.padding = "2px";
			node.style.border = "1px dotted " + color_fuzzy;
			node.onmouseover = mouseOverEvent;
			node.onmouseout = imgMouseOutEvent;
			node.onclick = imgMouseClickEvent;
		}
	}

	for (var i = 0 ; i < node.childNodes.length ; i++) {
		setProperties(node.childNodes[i]);
	}
}

window.onload = function() {
	var functions_ok = 0;

	if (window.XMLHttpRequest)
		functions_ok++;

	if (encodeURI)
		functions_ok++;

	if (functions_ok != 2) {
		window.alert('Your browser does not support some JavaScript ' +
			'functions which are needed for this page to work correctly. ' +
			"\nBrowser known to work : Safari 4, Firefox/BeZillaBrowser 2.x, " + "3.x.");
		return;
	}

	setProperties(document.getElementsByTagName('html')[0]);

	if (title_insert) {
		// The translatable text used in the <title> tag is not used anywhere else.
		// Since the translate tool does not allow translating <title>, we must insert
		// this text somewhere.
		var new_title = document.createElement("h1");
		new_title.setAttribute(attr_trans_id, title_id);
		new_title.appendChild(document.createTextNode(source_strings[title_id]));

		if (first_title != null && first_title.parentNode != null) {
			first_title.parentNode.insertBefore(new_title, first_title);
		} else {
			document.body.insertBefore(new_title, document.body.firstChild);
		}

		setProperties(new_title);
	}
}
