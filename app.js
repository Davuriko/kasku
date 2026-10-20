const CO = [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Hiburan",
    "Tagihan",
    "Kesehatan",
    "Lainnya",
  ],
  CI = ["Gaji", "Bonus", "Lainnya"],
  COL = [
    "#0f6b5c",
    "#e0a100",
    "#3b6fd4",
    "#b5438f",
    "#c0392b",
    "#6a8d2f",
    "#7a8b91",
  ],
  TABS = [
    ["home", "Beranda"],
    ["budget", "Anggaran"],
    ["report", "Laporan"],
    ["loan", "Pinjaman"],
    ["goal", "Tabungan"],
    ["profile", "Profil"],
  ];
const LS = (k, v) => {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k));
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      return null;
    }
  },
  E = () => ({ tx: [], bud: {}, loans: [], goals: [] }),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  av = (u, c) =>
    u.photo
      ? `<img class="av ${c || ""}" src="${u.photo}" alt="">`
      : `<span class="av ${c || ""}">${esc((u.name[0] || "?").toUpperCase())}</span>`,
  hash = async (p, s) => {
    try {
      const b = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(s + p),
      );
      return [...new Uint8Array(b)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      let h = 5381;
      for (const c of s + p) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
      return "f" + h;
    }
  },
  idb = (m, k, v) =>
    new Promise((r) => {
      try {
        const q = indexedDB.open("kasku_img", 1);
        q.onupgradeneeded = () => q.result.createObjectStore("i");
        q.onerror = () => r(null);
        q.onsuccess = () => {
          const s = q.result
              .transaction("i", m == "get" ? "readonly" : "readwrite")
              .objectStore("i"),
            x = m == "get" ? s.get(k) : m == "put" ? s.put(v, k) : s.delete(k);
          x.onsuccess = () => r(x.result || true);
          x.onerror = () => r(null);
        };
      } catch (e) {
        r(null);
      }
    }),
  shrink = (f, max, q) =>
    new Promise((ok, no) => {
      const i = new Image(),
        u = URL.createObjectURL(f);
      i.onload = () => {
        const k = Math.min(1, max / Math.max(i.width, i.height)),
          c = document.createElement("canvas");
        c.width = i.width * k;
        c.height = i.height * k;
        c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        ok(c.toDataURL("image/jpeg", q));
      };
      i.onerror = () => no();
      i.src = u;
    });
let USERS = LS("kasku_users") || [],
  U = null,
  D = E(),
  authMode = USERS.length ? "login" : "reg",
  tab = "home",
  mo = 0,
  _rc = null,
  form = { type: "out", cat: "Makanan" };
const CURS = {
    // r = nilai 1 unit mata uang dalam IDR (kurs acuan, perkiraan)
    IDR: { s: "Rp", l: "id-ID", d: 0, g: ".", dc: ",", r: 1 },
    USD: { s: "$", l: "en-US", d: 2, g: ",", dc: ".", r: 16000 },
    EUR: { s: "€", l: "de-DE", d: 2, g: ".", dc: ",", r: 17500 },
    GBP: { s: "£", l: "en-GB", d: 2, g: ",", dc: ".", r: 20500 },
    SGD: { s: "S$", l: "en-SG", d: 2, g: ",", dc: ".", r: 12000 },
    MYR: { s: "RM", l: "en-MY", d: 2, g: ",", dc: ".", r: 3600 },
    AUD: { s: "A$", l: "en-AU", d: 2, g: ",", dc: ".", r: 10500 },
    JPY: { s: "¥", l: "ja-JP", d: 0, g: ",", dc: ".", r: 105 },
  },
  cur = () => CURS[D.cur] || CURS.IDR,
  cin = () => CURS[D.curIn] || cur(),
  // Semua nominal disimpan dalam basis IDR; format memakai kurs tiap mata uang.
  // basis IDR -> string untuk field input (mata uang input)
  fmtN = (n) => {
    const c = cin();
    return (n / c.r).toLocaleString(c.l, { maximumFractionDigits: c.d });
  },
  P = (t) => {
    const c = cin(),
      v = parseFloat(
        String(t || "")
          .split(c.g)
          .join("")
          .replace(c.dc, "."),
      );
    return isNaN(v) ? 0 : Math.round(v * c.r);
  },
  fmtIn = (el) => {
    const c = cin(),
      pos = el.selectionStart,
      nb = el.value.slice(0, pos).replace(/\D/g, "").length;
    let v = el.value.split(c.g).join(""),
      i = c.d ? v.indexOf(c.dc) : -1,
      ip = (i < 0 ? v : v.slice(0, i)).replace(/\D/g, ""),
      fp =
        i < 0
          ? null
          : v
              .slice(i + 1)
              .replace(/\D/g, "")
              .slice(0, c.d);
    ip = ip.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, c.g);
    if (fp !== null && !ip) ip = "0";
    el.value = ip + (fp === null ? "" : c.dc + fp);
    if (document.activeElement == el) {
      let n = 0,
        q = 0;
      for (; q < el.value.length && n < nb; q++)
        if (/\d/.test(el.value[q])) n++;
      try {
        el.setSelectionRange(q, q);
      } catch (e) {}
    }
  };
const loadUser = (u) => {
  U = u;
  D = Object.assign(E(), LS("kasku:" + u.id) || {});
  if (D.v !== 2) {
    // migrasi nominal lama (disimpan dalam mata uang tampilan) ke basis IDR
    const r = (CURS[D.cur] || CURS.IDR).r;
    if (r !== 1) {
      D.tx.forEach((x) => (x.amt = Math.round(x.amt * r)));
      for (const k in D.bud) D.bud[k] = Math.round(D.bud[k] * r);
      D.loans.forEach((l) => {
        l.amt = Math.round(l.amt * r);
        l.paid = Math.round(l.paid * r);
      });
      D.goals.forEach((g) => {
        g.target = Math.round(g.target * r);
        g.saved = Math.round(g.saved * r);
      });
    }
    D.v = 2;
    LS("kasku:" + u.id, D);
  }
  LS("kasku_sess", u.id);
};
{
  const s = USERS.find((x) => x.id == LS("kasku_sess"));
  if (s) loadUser(s);
}
function authView() {
  const r = authMode == "reg";
  return `<div class="auth"><h1>Kasku</h1><p class="mut">${r ? "Buat akun untuk menyimpan catatan keuanganmu di perangkat ini." : "Masuk untuk melanjutkan."}</p><div class="card"><input id="un" placeholder="Nama pengguna" autocomplete="username"><input id="pw" type="password" placeholder="Kata sandi${r ? " (min. 6 karakter)" : ""}" autocomplete="${r ? "new-password" : "current-password"}">${r ? '<input id="pw2" type="password" placeholder="Ulangi kata sandi" autocomplete="new-password">' : ""}<button data-a="${r ? "reg" : "login"}" style="width:100%">${r ? "Buat akun" : "Masuk"}</button></div><p style="text-align:center"><button class="g sm" data-a="am">${r ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button></p></div>`;
}
const $ = (s) => document.querySelector(s),
  R = (n) => {
    const c = cur(),
      v = n / c.r;
    return (
      (v < 0 ? "-" : "") +
      c.s +
      Math.abs(v).toLocaleString(c.l, {
        minimumFractionDigits: c.d,
        maximumFractionDigits: c.d,
      })
    );
  },
  save = () => {
    if (U) LS("kasku:" + U.id, D);
  },
  today = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  },
  mk = (off) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + off);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  },
  mname = (k) =>
    new Date(k + "-01").toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
  id = () => Date.now() + Math.random(),
  sum = (a, f) => a.reduce((s, x) => s + f(x), 0),
  inM = (k, t) =>
    D.tx.filter((x) => x.date.startsWith(k) && (!t || x.type == t)),
  spent = (k, c) =>
    sum(
      inM(k, "out").filter((x) => x.cat == c),
      (x) => x.amt,
    );

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.style.display = "none"), 4000);
}

// Notifikasi peringatan anggaran
function checkBudget(cat) {
  const lim = D.bud[cat];
  if (!lim) return;
  const p = (spent(mk(0), cat) / lim) * 100;
  let m =
    p >= 100
      ? `Anggaran ${cat} sudah terlampaui (${Math.round(p)}%)!`
      : p >= 80
        ? `Anggaran ${cat} hampir habis (${Math.round(p)}%).`
        : "";
  if (!m) return;
  toast(m);
  try {
    if (window.Notification && Notification.permission === "granted")
      new Notification("Kasku", { body: m });
    else if (window.Notification && Notification.permission === "default")
      Notification.requestPermission();
  } catch (e) {}
}

// Baca teks SMS / notifikasi bank & e-wallet. Bisa dipanggil dari kode native: window.parseBankText(teks)
function parseBankText(t) {
  const m = t.match(/(?:rp\.?|idr)\s*([\d.,]+)/i);
  if (!m) return null;
  let n = m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(/,\d{1,2}$/, "");
  const amt = parseInt(n.replace(/\D/g, ""), 10);
  if (!amt) return null;
  const low = t.toLowerCase(),
    inn =
      /(masuk|diterima|terima|kredit|top.?up berhasil|gaji|cashback|refund)/.test(
        low,
      ) && !/(transfer ke|pembayaran|debit)/.test(low),
    rules = [
      [
        /gojek|grab(?!food)|kereta|krl|tol|bensin|spbu|parkir|mrt|transjakarta/,
        "Transportasi",
      ],
      [
        /gofood|grabfood|shopeefood|kfc|resto|cafe|kopi|makan|warung|mcd/,
        "Makanan",
      ],
      [/indomaret|alfamart|tokopedia|shopee|lazada|blibli|tiktok/, "Belanja"],
      [/netflix|spotify|bioskop|xxi|steam|youtube|game/, "Hiburan"],
      [/pln|listrik|pdam|telkom|indihome|pulsa|bpjs|cicilan/, "Tagihan"],
      [/apotek|klinik|rumah sakit|dokter/, "Kesehatan"],
    ];
  let cat = "Lainnya";
  for (const [r, c] of rules)
    if (r.test(low)) {
      cat = c;
      break;
    }
  return {
    type: inn ? "in" : "out",
    amt,
    cat: inn ? "Lainnya" : cat,
    note: t.slice(0, 60),
  };
}
window.parseBankText = (t) => {
  const r = parseBankText(t);
  if (r) {
    D.tx.push({ id: id(), date: today(), ...r });
    save();
    if (r.type == "out") checkBudget(r.cat);
    render();
  }
  return r;
};

// ---------- Tampilan ----------
const V = {
  home() {
    const k = mk(0),
      tin = sum(inM(k, "in"), (x) => x.amt),
      tout = sum(inM(k, "out"), (x) => x.amt),
      bal = sum(D.tx, (x) => (x.type == "in" ? x.amt : -x.amt));
    const al = CO.filter((c) => D.bud[c] && spent(k, c) / D.bud[c] >= 0.8)
      .map((c) => {
        const p = (spent(k, c) / D.bud[c]) * 100;
        return `<div class="alert ${p >= 100 ? "b" : ""}"><b>${c}</b>: ${Math.round(p)}% dari anggaran ${p >= 100 ? "(terlampaui)" : ""}</div>`;
      })
      .join("");
    const rec = [...D.tx]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .slice(0, 10)
      .map(
        (x) =>
          `<div class="row" style="padding:9px 0;border-top:1px solid var(--ln)"><div><b>${x.cat}</b><div class="mut">${esc(x.note || "")} ${x.date.slice(5).split("-").reverse().join("/")}</div></div><div class="row"><b class="${x.type}">${x.type == "in" ? "+" : "-"}${R(x.amt)}</b>${x.img ? `<button class="g sm" data-a="img" data-id="${x.id}">📎</button>` : ""}<button class="g sm" data-a="del" data-id="${x.id}">✕</button></div></div>`,
      )
      .join("");
    return `<div class="row" style="margin-bottom:12px"><h1 style="margin:0">Halo, ${esc(U.name)}</h1><span data-a="tab" data-t="profile" style="cursor:pointer">${av(U)}</span></div><div class="card"><div class="mut">Saldo total</div><div class="big">${R(bal)}</div><div class="row" style="margin-top:8px"><div><div class="mut">Masuk bulan ini</div><b class="in">${R(tin)}</b></div><div><div class="mut">Keluar bulan ini</div><b class="out">${R(tout)}</b></div></div></div>${al}<h2>Transaksi terakhir</h2><div class="card" style="padding-top:5px">${rec || '<p class="mut">Belum ada transaksi. Ketuk + untuk mencatat.</p>'}</div>`;
  },
  budget() {
    const k = mk(0);
    return (
      `<h1>Anggaran bulanan</h1><p class="mut">Atur batas per kategori untuk ${mname(k)}. Kosongkan jika tanpa batas.</p>` +
      CO.map((c) => {
        const s = spent(k, c),
          l = D.bud[c] || 0,
          p = l ? (s / l) * 100 : 0;
        return `<div class="card"><div class="row"><b>${c}</b><span class="mut">${R(s)}${l ? " / " + R(l) : ""}</span></div><input class="amt" inputmode="${cin().d ? "decimal" : "numeric"}" placeholder="Batas (${cin().s})" value="${l ? fmtN(l) : ""}" data-b="${c}" autocomplete="off" style="margin:8px 0 0">${l ? `<div class="bar"><i class="${p >= 100 ? "b" : p >= 80 ? "w" : ""}" style="width:${Math.min(p, 100)}%"></i></div><div class="mut">${Math.round(p)}% terpakai, sisa ${R(l - s)}</div>` : ""}</div>`;
      }).join("")
    );
  },
  report() {
    const k = mk(mo),
      ex = inM(k, "out"),
      tot = sum(ex, (x) => x.amt),
      by = CO.map((c, i) => ({ c, v: spent(k, c), col: COL[i] })).filter(
        (x) => x.v > 0,
      );
    let pie = "",
      a = -Math.PI / 2;
    if (by.length == 1)
      pie = `<circle class="sl" data-a="sel" data-i="0" r="80" fill="${by[0].col}"/>`;
    else
      by.forEach((x, i) => {
        const g = (x.v / tot) * Math.PI * 2,
          x1 = 80 * Math.cos(a),
          y1 = 80 * Math.sin(a);
        a += g;
        pie += `<path class="sl" data-a="sel" data-i="${i}" d="M0 0L${x1} ${y1}A80 80 0 ${g > Math.PI ? 1 : 0} 1 ${80 * Math.cos(a)} ${80 * Math.sin(a)}Z" fill="${x.col}" stroke="var(--card)" stroke-width="2"/>`;
      });
    window._by = by;
    window._tot = tot;
    const ms = [5, 4, 3, 2, 1, 0].map((i) => {
        const m = mk(mo - i);
        return { m, v: sum(inM(m, "out"), (x) => x.amt) };
      }),
      mx = Math.max(...ms.map((x) => x.v), 1);
    const bars = ms
      .map((x, i) => {
        const h = (x.v / mx) * 110;
        return `<g class="sl" data-a="bar" data-i="${i}"><rect x="${i * 50 + 8}" y="${130 - h}" width="34" height="${h}" rx="4" fill="${i == 5 ? "var(--ac)" : "var(--ln)"}"/><text x="${i * 50 + 25}" y="146" font-size="11" text-anchor="middle" fill="var(--mut)">${new Date(x.m + "-01").toLocaleDateString("id-ID", { month: "short" })}</text></g>`;
      })
      .join("");
    window._ms = ms;
    const cur = ms[5].v,
      prev = ms[4].v,
      pc = prev ? ((cur - prev) / prev) * 100 : null,
      avg = sum(ms.slice(0, 5), (x) => x.v) / 5;
    let tr =
      pc === null
        ? "Belum ada data bulan sebelumnya untuk dibandingkan."
        : `Pengeluaran ${pc > 0 ? "naik" : "turun"} <b class="${pc > 0 ? "out" : "in"}">${Math.abs(Math.round(pc))}%</b> dibanding bulan lalu (${R(prev)}).`;
    if (avg > 0)
      tr += ` Rata-rata 5 bulan sebelumnya ${R(avg)}; bulan ini ${cur > avg ? "di atas" : "di bawah"} rata-rata.`;
    const top = by.length ? [...by].sort((a, b) => b.v - a.v)[0] : null;
    return `<h1>Laporan</h1><div class="row"><button class="g sm" data-a="mo" data-d="-1">‹</button><b>${mname(k)}</b><button class="g sm" data-a="mo" data-d="1" ${mo >= 0 ? "disabled" : ""}>›</button></div><h2>Ke mana uang mengalir</h2><div class="card">${by.length ? `<svg viewBox="-100 -100 200 200" width="200" height="200" style="display:block;margin:auto">${pie}<circle r="46" fill="var(--card)"/><text id="pt" text-anchor="middle" y="-2" font-size="11" fill="var(--mut)">Total</text><text id="pv" text-anchor="middle" y="14" font-size="13" font-weight="700" fill="var(--ink)">${R(tot)}</text></svg><div style="margin-top:10px">${by.map((x, i) => `<div class="leg" data-a="sel" data-i="${i}"><i style="background:${x.col}"></i><span style="flex:1">${x.c}</span><b>${R(x.v)}</b><span class="mut">${Math.round((x.v / tot) * 100)}%</span></div>`).join("")}</div>` : '<p class="mut">Belum ada pengeluaran bulan ini.</p>'}</div><h2>Tren 6 bulan</h2><div class="card"><svg viewBox="0 0 300 150" width="100%">${bars}</svg><div class="mut" id="bv">Ketuk batang untuk melihat nominal.</div></div><div class="card"><b>Analisis</b><p style="margin:6px 0 0">${tr}${top ? ` Kategori terbesar bulan ini: <b>${top.c}</b> (${Math.round((top.v / tot) * 100)}%).` : ""}</p></div>`;
  },
  profile() {
    return `<h1>Profil</h1><div class="card" style="text-align:center">${av(U, "l")}<div style="margin:12px 0 4px"><label class="lb">Ganti foto<input type="file" accept="image/*" hidden data-f="avatar"></label> ${U.photo ? '<button class="g sm" data-a="pdel">Hapus foto</button>' : ""}</div></div><div class="card"><b>Nama pengguna</b><input id="pn" value="${esc(U.name)}" style="margin-top:8px"><button class="sm" data-a="pname">Simpan nama</button></div><div class="card"><b>Mata uang</b><select data-cur="1" style="margin:8px 0 4px">${Object.keys(
      CURS,
    )
      .map(
        (k) =>
          `<option value="${k}" ${(D.cur || "IDR") == k ? "selected" : ""}>${k} (${CURS[k].s})</option>`,
      )
      .join(
        "",
      )}</select><div class="mut">Mengubah tampilan semua nominal ke mata uang ini memakai kurs perkiraan. Angka yang tersimpan tidak berubah.</div></div><div class="card"><b>Mata uang input</b><select data-curin="1" style="margin:8px 0 4px">${Object.keys(
      CURS,
    )
      .map(
        (k) =>
          `<option value="${k}" ${(D.curIn || D.cur || "IDR") == k ? "selected" : ""}>${k} (${CURS[k].s})</option>`,
      )
      .join(
        "",
      )}</select><div class="mut">Mata uang yang kamu ketik saat mencatat. Nominal otomatis dikonversi ke mata uang tampilan di atas.</div></div><div class="card"><b>Ganti kata sandi</b><input id="po" type="password" placeholder="Kata sandi lama" style="margin-top:8px" autocomplete="current-password"><input id="pp" type="password" placeholder="Kata sandi baru" autocomplete="new-password"><button class="sm" data-a="ppass">Ganti</button></div><button class="g" data-a="logout" style="width:100%">Keluar</button><p class="mut">Akun dan data tersimpan hanya di perangkat ini. Jika lupa kata sandi, data tidak bisa dipulihkan.</p>`;
  },
  loan() {
    const ow = D.loans
        .filter((l) => l.kind == "piutang")
        .reduce((s, l) => s + l.amt - l.paid, 0),
      db = D.loans
        .filter((l) => l.kind == "utang")
        .reduce((s, l) => s + l.amt - l.paid, 0);
    return (
      `<h1>Pinjaman</h1><div class="card row"><div><div class="mut">Orang berutang ke Anda</div><b class="in">${R(ow)}</b></div><div><div class="mut">Utang Anda</div><b class="out">${R(db)}</b></div></div><div class="card"><div class="seg"><button class="on" id="lk" data-a="lk" data-k="piutang">Saya meminjamkan</button><button data-a="lk" data-k="utang">Saya berutang</button></div><input id="lw" placeholder="Nama orang"><input id="la" class="amt" inputmode="${cin().d ? "decimal" : "numeric"}" placeholder="Jumlah (${cin().s})" autocomplete="off"><input id="ld" type="date" placeholder="Jatuh tempo"><button data-a="ladd">Simpan</button></div>` +
      D.loans
        .map((l) => {
          const r = l.amt - l.paid;
          return `<div class="card"><div class="row"><b>${l.who}</b><span class="mut">${l.kind == "piutang" ? "Dipinjamkan" : "Utang saya"}</span></div><div class="row"><span>${r > 0 ? "Sisa " + R(r) : "<b class='in'>Lunas</b>"} dari ${R(l.amt)}</span><span class="mut">${l.due ? "Tempo " + l.due : ""}</span></div><div class="bar"><i style="width:${(l.paid / l.amt) * 100}%"></i></div><div class="row" style="margin-top:8px">${r > 0 ? `<button class="sm" data-a="lpay" data-id="${l.id}">Catat cicilan</button>` : "<span></span>"}<button class="g sm" data-a="ldel" data-id="${l.id}">Hapus</button></div></div>`;
        })
        .join("")
    );
  },
  goal() {
    return (
      `<h1>Target tabungan</h1><div class="card"><input id="gn" placeholder="Nama tujuan (dana darurat, liburan...)"><input id="gt" class="amt" inputmode="${cin().d ? "decimal" : "numeric"}" placeholder="Target (${cin().s})" autocomplete="off"><button data-a="gadd">Buat target</button></div>` +
        D.goals
          .map((g) => {
            const p = Math.min((g.saved / g.target) * 100, 100);
            return `<div class="card"><div class="row"><b>${g.name}</b><b>${Math.round(p)}%</b></div><div class="bar"><i style="width:${p}%"></i></div><div class="mut" style="margin-top:6px">${R(g.saved)} dari ${R(g.target)}${p >= 100 ? " ✓ tercapai" : ""}</div><div class="row" style="margin-top:8px"><button class="sm" data-a="gadd2" data-id="${g.id}">Tambah dana</button><button class="g sm" data-a="gdel" data-id="${g.id}">Hapus</button></div></div>`;
          })
          .join("") ||
      '<p class="mut">Belum ada target. Buat yang pertama di atas.</p>'
    );
  },
};

function render() {
  const a = !U;
  $("#fab").style.display = $("#nav").style.display = a ? "none" : "";
  if (a) {
    $("#v").innerHTML = authView();
    return;
  }
  $("#v").innerHTML = V[tab]();
  $("#nav").innerHTML = TABS.map(
    (t) =>
      `<button class="${t[0] == tab ? "on" : ""}" data-a="tab" data-t="${t[0]}">${t[1]}</button>`,
  ).join("");
}

function sheet() {
  const cats = form.type == "out" ? CO : CI;
  if (!cats.includes(form.cat)) form.cat = cats[0];
  $("#shc").innerHTML =
    `<div class="seg"><button class="${form.type == "out" ? "on" : ""}" data-a="ty" data-t="out">Pengeluaran</button><button class="${form.type == "in" ? "on" : ""}" data-a="ty" data-t="in">Pemasukan</button></div><input id="fa" class="amt" inputmode="${cin().d ? "decimal" : "numeric"}" placeholder="Jumlah (${cin().s})" autocomplete="off" autofocus>${D.curIn && D.curIn != (D.cur || "IDR") ? `<div class="mut" id="fcv" style="margin:-2px 0 8px">Input ${cin().s} → tampil dalam ${cur().s}</div>` : ""}<div class="chips">${cats.map((c) => `<button class="${c == form.cat ? "on" : ""}" data-a="ct" data-c="${c}">${c}</button>`).join("")}</div><input id="fn" placeholder="Barang / catatan (mis. beras 5 kg)"><label class="lb">📷 Lampirkan foto bukti atau barang<input type="file" accept="image/*" hidden data-f="rc"></label><span id="rp" style="margin-left:8px">${_rc ? `<img class="th" src="${_rc}" alt="">` : ""}</span><div style="height:8px"></div><input id="fd" type="date" value="${today()}"><button data-a="fs" style="width:100%">Simpan</button><h2>Atau tempel SMS / notifikasi bank</h2><textarea id="sms" rows="3" placeholder="Contoh: Transfer keluar Rp25.000 ke GOPAY..."></textarea><button class="g" data-a="sp" style="width:100%">Baca teks</button><button class="g" data-a="cl" style="width:100%;margin-top:8px;border:0">Tutup</button>`;
  $("#sh").classList.add("o");
}

const A = {
  tab: (d) => {
    tab = d.t;
    render();
    scrollTo(0, 0);
  },
  add: () => {
    _rc = null;
    sheet();
  },
  cl: () => {
    _rc = null;
    $("#sh").classList.remove("o");
  },
  ty: (d) => {
    const a = $("#fa").value,
      n = $("#fn").value;
    form.type = d.t;
    sheet();
    $("#fa").value = a;
    $("#fn").value = n;
  },
  ct: (d) => {
    form.cat = d.c;
    document
      .querySelectorAll(".chips button")
      .forEach((b) => b.classList.toggle("on", b.dataset.c == d.c));
  },
  fs: async () => {
    const amt = P($("#fa").value);
    if (!amt || amt <= 0) return toast("Isi jumlah lebih dari 0.");
    const tx = {
      id: id(),
      type: form.type,
      amt,
      cat: form.cat,
      note: $("#fn").value.trim(),
      date: $("#fd").value || today(),
    };
    if (_rc) {
      if (await idb("put", U.id + ":" + tx.id, _rc)) tx.img = 1;
      else toast("Foto gagal disimpan, transaksi disimpan tanpa foto.");
    }
    D.tx.push(tx);
    save();
    A.cl();
    render();
    if (form.type == "out") checkBudget(form.cat);
  },
  sp: () => {
    const r = parseBankText($("#sms").value);
    if (!r)
      return toast("Nominal tidak ditemukan. Pastikan teks memuat 'Rp...'.");
    form.type = r.type;
    form.cat = r.cat;
    sheet();
    $("#fa").value = fmtN(r.amt);
    $("#fn").value = r.note;
    toast("Terbaca: " + R(r.amt) + " (" + r.cat + "). Periksa lalu simpan.");
  },
  del: (d) => {
    if (confirm("Hapus transaksi ini?")) {
      D.tx = D.tx.filter((x) => x.id != d.id);
      idb("del", U.id + ":" + d.id);
      save();
      render();
    }
  },
  mo: (d) => {
    mo = Math.min(0, mo + +d.d);
    render();
  },
  sel: (d) => {
    const x = _by[d.i];
    $("#pt").textContent = x.c;
    $("#pv").textContent = R(x.v);
  },
  bar: (d) => {
    const x = _ms[d.i];
    $("#bv").textContent = mname(x.m) + ": " + R(x.v);
  },
  lk: (d) => {
    window._lk = d.k;
    document
      .querySelectorAll(".seg button")
      .forEach((b) => b.classList.toggle("on", b.dataset.k == d.k));
  },
  ladd: () => {
    const who = $("#lw").value.trim(),
      amt = P($("#la").value);
    if (!who || !amt) return toast("Isi nama dan jumlah.");
    D.loans.push({
      id: id(),
      kind: window._lk || "piutang",
      who,
      amt,
      paid: 0,
      due: $("#ld").value,
    });
    save();
    render();
  },
  lpay: (d) => {
    const l = D.loans.find((x) => x.id == d.id),
      v = P(prompt("Jumlah cicilan (" + cin().s + "):"));
    if (v > 0) {
      l.paid = Math.min(l.amt, l.paid + v);
      save();
      render();
    }
  },
  ldel: (d) => {
    if (confirm("Hapus catatan ini?")) {
      D.loans = D.loans.filter((x) => x.id != d.id);
      save();
      render();
    }
  },
  gadd: () => {
    const name = $("#gn").value.trim(),
      target = P($("#gt").value);
    if (!name || !target) return toast("Isi nama dan target.");
    D.goals.push({ id: id(), name, target, saved: 0 });
    save();
    render();
  },
  gadd2: (d) => {
    const g = D.goals.find((x) => x.id == d.id),
      v = P(prompt("Tambah dana (" + cin().s + "):"));
    if (v > 0) {
      g.saved += v;
      save();
      render();
    }
  },
  gdel: (d) => {
    if (confirm("Hapus target ini?")) {
      D.goals = D.goals.filter((x) => x.id != d.id);
      save();
      render();
    }
  },
  reg: async () => {
    const n = $("#un").value.trim(),
      p = $("#pw").value;
    if (n.length < 2) return toast("Nama pengguna minimal 2 karakter.");
    if (p.length < 6) return toast("Kata sandi minimal 6 karakter.");
    if (p != $("#pw2").value) return toast("Kata sandi tidak sama.");
    if (USERS.some((x) => x.name.toLowerCase() == n.toLowerCase()))
      return toast("Nama pengguna sudah dipakai.");
    const salt = Math.random().toString(36).slice(2),
      u = {
        id: Date.now().toString(36),
        name: n,
        salt,
        hash: await hash(p, salt),
        photo: "",
      };
    USERS.push(u);
    LS("kasku_users", USERS);
    const old = LS("kasku");
    if (old && USERS.length == 1) {
      LS("kasku:" + u.id, old);
      LS("kasku", null);
    }
    loadUser(u);
    tab = "home";
    render();
  },
  login: async () => {
    const n = $("#un").value.trim().toLowerCase(),
      u = USERS.find((x) => x.name.toLowerCase() == n);
    if (!u || (await hash($("#pw").value, u.salt)) != u.hash)
      return toast("Nama pengguna atau kata sandi salah.");
    loadUser(u);
    tab = "home";
    render();
  },
  am: () => {
    authMode = authMode == "reg" ? "login" : "reg";
    render();
  },
  logout: () => {
    LS("kasku_sess", null);
    U = null;
    D = E();
    authMode = "login";
    render();
  },
  pname: () => {
    const n = $("#pn").value.trim();
    if (n.length < 2) return toast("Nama minimal 2 karakter.");
    if (
      USERS.some((x) => x.id != U.id && x.name.toLowerCase() == n.toLowerCase())
    )
      return toast("Nama sudah dipakai.");
    U.name = n;
    LS("kasku_users", USERS);
    render();
    toast("Nama diperbarui.");
  },
  ppass: async () => {
    const o = $("#po").value,
      n = $("#pp").value;
    if ((await hash(o, U.salt)) != U.hash)
      return toast("Kata sandi lama salah.");
    if (n.length < 6) return toast("Kata sandi baru minimal 6 karakter.");
    U.hash = await hash(n, U.salt);
    LS("kasku_users", USERS);
    $("#po").value = $("#pp").value = "";
    toast("Kata sandi diganti.");
  },
  pdel: () => {
    U.photo = "";
    LS("kasku_users", USERS);
    render();
  },
  img: async (d) => {
    const s = await idb("get", U.id + ":" + d.id);
    if (!s || s === true) return toast("Foto tidak ditemukan.");
    $("#vw").innerHTML = '<img src="' + s + '" alt="">';
    $("#vw").style.display = "flex";
  },
  vc: () => {
    $("#vw").style.display = "none";
  },
};
document.addEventListener("click", (e) => {
  if (e.target.id == "sh") return A.cl();
  const t = e.target.closest("[data-a]");
  if (t && A[t.dataset.a]) A[t.dataset.a](t.dataset);
});
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("amt")) fmtIn(e.target);
});
document.addEventListener("change", async (e) => {
  const t = e.target,
    c = t.dataset.b,
    f = t.dataset.f;
  if (t.dataset.cur) {
    D.cur = t.value;
    save();
    render();
    return;
  }
  if (t.dataset.curin) {
    D.curIn = t.value;
    save();
    render();
    return;
  }
  if (c) {
    const v = P(t.value);
    v > 0 ? (D.bud[c] = v) : delete D.bud[c];
    save();
    render();
  }
  if (f && t.files[0]) {
    try {
      const s = await shrink(
        t.files[0],
        f == "avatar" ? 256 : 900,
        f == "avatar" ? 0.8 : 0.7,
      );
      if (f == "avatar") {
        U.photo = s;
        LS("kasku_users", USERS);
        render();
      } else {
        _rc = s;
        $("#rp").innerHTML = '<img class="th" src="' + s + '" alt="">';
      }
    } catch (x) {
      toast("Gambar tidak bisa dibaca.");
    }
  }
});
render();
