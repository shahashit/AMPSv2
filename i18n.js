// AMPS runtime translation: replaces English text nodes / placeholders using window.AMPS_I18N[lang].
(function () {
  var KEY = 'amps-lang';
  function lang() { try { return localStorage.getItem(KEY) || 'EN'; } catch (e) { return 'EN'; } }
  window.AMPS_LANG = lang();
  window.AMPS_setLang = function (l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); };
  var dict = null, orig = new WeakMap(), busy = false;
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function tr(s) {
    var k = norm(s); if (!k) return null;
    var v = dict[k]; if (v == null) return null;
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + v + trail;
  }
  function walk(root) {
    if (!dict) return;
    busy = true;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var p = n.parentNode; if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') continue;
      var o = orig.get(n); var src = (o && n.nodeValue === o.t) ? o.s : n.nodeValue;
      var t = tr(src); if (t != null && t !== n.nodeValue) { n.nodeValue = t; orig.set(n, { s: src, t: t }); }
    }
    var els = (root.querySelectorAll ? root : document).querySelectorAll('[placeholder],[title],[aria-label]');
    for (var i = 0; i < els.length; i++) {
      ['placeholder', 'title', 'aria-label'].forEach(function (a) {
        var v = els[i].getAttribute(a); if (!v) return; var t = tr(v); if (t != null && t !== v) els[i].setAttribute(a, t);
      });
    }
    busy = false;
  }
  function start() {
    var L = window.AMPS_LANG; if (L === 'EN') return;
    dict = (window.AMPS_I18N && window.AMPS_I18N[L]) || null; if (!dict) return;
    document.documentElement.lang = L.toLowerCase();
    walk(document.body);
    var pending = false;
    new MutationObserver(function () {
      if (busy || pending) return; pending = true;
      requestAnimationFrame(function () { pending = false; walk(document.body); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
