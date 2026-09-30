export default function RobotArt() {
  return <svg viewBox="0 0 400 320" className="robot-art" role="img" aria-label="A little cyan robot collecting energy in the arcade arena">
    <defs>
      <linearGradient id="robotBody" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5cf4df" /><stop offset="1" stopColor="#17abc0" /></linearGradient>
      <linearGradient id="robotFace" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#163c49" /><stop offset="1" stopColor="#091a25" /></linearGradient>
    </defs>
    <ellipse cx="200" cy="268" rx="83" ry="14" fill="#030b13" opacity=".6" />
    <g stroke="#234352" fill="none"><ellipse cx="200" cy="175" rx="158" ry="103" strokeDasharray="3 9" /><ellipse cx="200" cy="175" rx="116" ry="76" /></g>
    <g transform="translate(96 80) rotate(-12 104 110)">
      <path d="M104 33V12" stroke="#56dddc" strokeWidth="7" strokeLinecap="round" />
      <circle cx="104" cy="8" r="9" fill="#c4f979" />
      <rect x="29" y="92" width="22" height="55" rx="9" fill="#2496ac" />
      <rect x="157" y="92" width="22" height="55" rx="9" fill="#2496ac" />
      <rect x="57" y="182" width="30" height="22" rx="8" fill="#16566d" />
      <rect x="121" y="182" width="30" height="22" rx="8" fill="#16566d" />
      <rect x="42" y="40" width="124" height="150" rx="33" fill="url(#robotBody)" />
      <path d="M69 47H132" stroke="#b9fff2" strokeWidth="4" strokeLinecap="round" opacity=".65" />
      <rect x="54" y="65" width="100" height="81" rx="24" fill="url(#robotFace)" />
      <rect x="73" y="85" width="16" height="24" rx="8" fill="#bcfff2" />
      <rect x="119" y="85" width="16" height="24" rx="8" fill="#bcfff2" />
      <path d="M93 120Q104 128 115 120" stroke="#54efcf" strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="83" y="162" width="42" height="10" rx="5" fill="#0f6578" />
      <rect x="86" y="165" width="26" height="4" rx="2" fill="#c4f979" />
    </g>
    <g transform="translate(49 123) rotate(-12)"><rect width="28" height="39" rx="7" fill="#c4f979" /><path d="M15 7L8 21H15L12 32L22 16H15Z" fill="#16382c" /></g>
    <g transform="translate(316 168) rotate(18)"><rect x="-18" y="-18" width="36" height="36" rx="10" fill="#5ce0f0" /><path d="M-6 0H6M0-6V6" stroke="#0a3948" strokeWidth="3" strokeLinecap="round" /></g>
    <g transform="translate(287 63)"><circle r="17" fill="#f8cb73" /><path d="M0-9L2-2L9 0L2 2L0 9L-2 2L-9 0L-2-2Z" fill="#765320" /></g>
    <g transform="translate(80 242)" stroke="#fd7b86" strokeWidth="2"><path d="M0-9L10 9H-10Z" fill="#271c2b" /><path d="M0-3V2M0 5V6" /></g>
    <g fill="#597886"><circle cx="322" cy="101" r="3" /><circle cx="91" cy="63" r="3" /><circle cx="296" cy="250" r="3" /></g>
  </svg>;
}
