import { ORIGIN } from "@/lib/tweet";
import { copper, cream, gold, ink, scoreHex, scoreInk, sea } from "@/lib/viz";

export const PAGE = ink;
export const NAVY = cream;
export const PANEL = "#f4f8fc";
export const MUTED = "rgba(11,31,51,0.55)";
export const LINE = "rgba(11,31,51,0.12)";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function waterline() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 20px">
    <tr>
      <td style="height:3px;background:${sea};width:42%;font-size:0;line-height:0">&nbsp;</td>
      <td style="height:3px;background:${gold};width:22%;font-size:0;line-height:0">&nbsp;</td>
      <td style="height:3px;background:${copper};width:36%;font-size:0;line-height:0">&nbsp;</td>
    </tr>
  </table>`;
}

export function kicker(text: string) {
  return `<p style="margin:0;letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:${copper};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(text)}</p>`;
}

export function heading(text: string) {
  return `<h1 class="fb-h1" style="margin:10px 0 0;font-size:32px;line-height:1.18;color:${NAVY};font-family:Georgia,'Times New Roman',serif">${escapeHtml(text)}</h1>`;
}

export function dek(text: string) {
  return `<p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:${MUTED};font-family:Georgia,'Times New Roman',serif">${escapeHtml(text)}</p>`;
}

export function sectionTitle(text: string) {
  return `<p style="margin:26px 0 12px;letter-spacing:.16em;text-transform:uppercase;font-size:11px;color:${copper};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(text)}</p>`;
}

export function btn(href: string, label: string) {
  return `<a href="${href}" class="fb-btn" style="display:inline-block;background:${sea};color:${PAGE};text-decoration:none;padding:13px 20px;border-radius:10px;font-size:15px;line-height:1.2;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(label)}</a>`;
}

export function scoreDisc(score: number, label = "Today") {
  const bg = scoreHex(score);
  const fg = scoreInk(score);
  return `<table role="presentation" width="92" height="92" cellpadding="0" cellspacing="0" style="width:92px;height:92px;border-collapse:separate">
    <tr>
      <td align="center" valign="middle" style="width:92px;height:92px;background:${bg};border-radius:46px;color:${fg}">
        <div style="font-size:26px;line-height:1;font-weight:700;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${score.toFixed(1)}</div>
        <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding-top:4px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(label)}</div>
      </td>
    </tr>
  </table>`;
}

export function tile(label: string, value: string, note?: string) {
  return `<td width="50%" valign="top" style="width:50%;padding:0 6px 12px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${PANEL};border:1px solid ${LINE};border-radius:14px">
      <tr>
        <td style="padding:12px 14px">
          <p style="margin:0;letter-spacing:.14em;text-transform:uppercase;font-size:10px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(label)}</p>
          <p style="margin:6px 0 0;font-size:20px;line-height:1.2;color:${NAVY};font-family:Georgia,'Times New Roman',serif">${escapeHtml(value)}</p>
          ${note ? `<p style="margin:5px 0 0;font-size:12px;line-height:1.35;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(note)}</p>` : ""}
        </td>
      </tr>
    </table>
  </td>`;
}

export function tileRow(left: { label: string; value: string; note?: string }, right?: { label: string; value: string; note?: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0">
    <tr>
      ${tile(left.label, left.value, left.note)}
      ${right ? tile(right.label, right.value, right.note) : `<td width="50%" style="width:50%;padding:0 0 12px">&nbsp;</td>`}
    </tr>
  </table>`;
}

export function brandBar() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 6px">
    <tr>
      <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${NAVY}">On This Water</td>
      <td align="right" style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${sea}">Seven coasts</td>
    </tr>
  </table>`;
}

export function emailDoc(opts: { preheader?: string; hero?: string; brand?: boolean; body: string; legend?: string }) {
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>`
    : "";
  const legend =
    opts.legend ?? "Scores are 1–10. They are not a bite. Not a chart you steer by.";
  const showBrand = opts.brand ?? !opts.hero;
  const topPad = opts.hero || !showBrand ? "18px 18px 40px" : "28px 18px 40px";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<title>On This Water</title>
<style>
  html,body{margin:0!important;padding:0!important;width:100%!important}
  body{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:${PANEL};color:${NAVY}}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
  a{text-decoration:none}
  @media only screen and (max-width:620px){
    .fb-wrap{width:100%!important;max-width:100%!important}
    .fb-pad{padding:18px 14px 28px!important}
    .fb-h1{font-size:26px!important;line-height:1.22!important}
    .fb-btn{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:center!important}
    .fb-tide{display:block!important;padding:3px 0!important}
    .fb-cal td{font-size:11px!important;padding:4px 1px!important;line-height:1.15!important}
    .fb-label{width:34%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PANEL};color:${NAVY};font-family:Georgia,'Times New Roman',serif">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};width:100%">
  <tr>
    <td align="center" style="padding:0">
      <table role="presentation" class="fb-wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
        ${opts.hero ? `<tr><td style="padding:0;font-size:0;line-height:0;background:${PANEL}">${opts.hero}</td></tr>` : ""}
        <tr>
          <td class="fb-pad" style="padding:${topPad};background:${PAGE}">
            ${showBrand ? `${brandBar()}${waterline()}` : ""}
            ${opts.body}
            ${waterline()}
            <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
              ${escapeHtml(legend)}
              <a href="${ORIGIN}" style="color:${sea}">Open the live brief</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
