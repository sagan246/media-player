// Theme metadata and accent palettes. Layout components consume semantic CSS
// variables, so adding a color here does not require component-specific CSS.
(function(){
  "use strict";

  const families = [
    {
      family:"blue",
      label:"Blue",
      light:{id:"light", className:"theme-light", accent:"#2563eb", strong:"#3b82f6", deep:"#1d4ed8", rgb:"37,99,235", strongRgb:"59,130,246", glowRgb:"96,165,250", sheenRgb:"147,197,253", link:"#1d4ed8", swatchA:"#f8fafc", swatchB:"#3b82f6", browserColor:"#f7f8fb"},
      dark:{id:"blue", className:"", accent:"#3f6fd8", strong:"#6f99f2", deep:"#3b82f6", rgb:"63,111,216", strongRgb:"111,153,242", glowRgb:"96,165,250", sheenRgb:"141,183,255", link:"#8db7ff", swatchA:"#3f6fd8", swatchB:"#6f99f2"},
    },
    {
      family:"purple",
      label:"Purple",
      light:{id:"lightPurple", className:"theme-light-purple", accent:"#7c3aed", strong:"#a855f7", deep:"#6d28d9", rgb:"124,58,237", strongRgb:"168,85,247", glowRgb:"196,181,253", sheenRgb:"221,214,254", link:"#6d28d9", swatchA:"#f5f3ff", swatchB:"#a855f7", browserColor:"#f5f3ff"},
      dark:{id:"purple", className:"theme-purple", accent:"#7c3aed", strong:"#a855f7", deep:"#6d28d9", rgb:"124,58,237", strongRgb:"168,85,247", glowRgb:"192,132,252", sheenRgb:"216,180,254", link:"#d8b4fe", swatchA:"#7c3aed", swatchB:"#a855f7"},
    },
    {
      family:"pink",
      label:"Pink",
      light:{id:"lightPink", className:"theme-light-pink", accent:"#db2777", strong:"#f472b6", deep:"#be185d", rgb:"219,39,119", strongRgb:"244,114,182", glowRgb:"251,113,133", sheenRgb:"251,207,232", link:"#be185d", swatchA:"#fff1f2", swatchB:"#f472b6", browserColor:"#fdf2f8"},
      dark:{id:"pink", className:"theme-pink", accent:"#db2777", strong:"#f472b6", deep:"#be185d", rgb:"219,39,119", strongRgb:"244,114,182", glowRgb:"251,113,133", sheenRgb:"251,207,232", link:"#fbcfe8", swatchA:"#db2777", swatchB:"#f472b6"},
    },
    {
      family:"green",
      label:"Green",
      light:{id:"lightGreen", className:"theme-light-green", accent:"#059669", strong:"#34d399", deep:"#047857", rgb:"5,150,105", strongRgb:"52,211,153", glowRgb:"110,231,183", sheenRgb:"167,243,208", link:"#047857", swatchA:"#ecfdf5", swatchB:"#34d399", browserColor:"#f0fdf4"},
      dark:{id:"green", className:"theme-green", accent:"#059669", strong:"#34d399", deep:"#047857", rgb:"5,150,105", strongRgb:"52,211,153", glowRgb:"45,212,191", sheenRgb:"167,243,208", link:"#a7f3d0", swatchA:"#059669", swatchB:"#34d399"},
    },
    {
      family:"gold",
      label:"Gold",
      light:{id:"lightGold", className:"theme-light-gold", accent:"#d97706", strong:"#fbbf24", deep:"#b45309", rgb:"217,119,6", strongRgb:"251,191,36", glowRgb:"245,158,11", sheenRgb:"254,240,138", link:"#92400e", swatchA:"#fffbeb", swatchB:"#fbbf24", browserColor:"#fffbeb"},
      dark:{id:"gold", className:"theme-gold", accent:"#d97706", strong:"#fbbf24", deep:"#b45309", rgb:"217,119,6", strongRgb:"251,191,36", glowRgb:"245,158,11", sheenRgb:"254,240,138", link:"#fef08a", swatchA:"#d97706", swatchB:"#fbbf24"},
    },
    {
      family:"cyan",
      label:"Cyan",
      light:{id:"lightCyan", className:"theme-light-cyan", accent:"#0891b2", strong:"#22d3ee", deep:"#0e7490", rgb:"8,145,178", strongRgb:"34,211,238", glowRgb:"56,189,248", sheenRgb:"165,243,252", link:"#0e7490", swatchA:"#ecfeff", swatchB:"#22d3ee", browserColor:"#ecfeff"},
      dark:{id:"cyan", className:"theme-cyan", accent:"#0891b2", strong:"#22d3ee", deep:"#0e7490", rgb:"8,145,178", strongRgb:"34,211,238", glowRgb:"56,189,248", sheenRgb:"165,243,252", link:"#a5f3fc", swatchA:"#0891b2", swatchB:"#22d3ee"},
    },
    {
      family:"red",
      label:"Red",
      light:{id:"lightRed", className:"theme-light-red", accent:"#dc2626", strong:"#f87171", deep:"#b91c1c", rgb:"220,38,38", strongRgb:"248,113,113", glowRgb:"239,68,68", sheenRgb:"254,202,202", link:"#b91c1c", swatchA:"#fef2f2", swatchB:"#f87171", browserColor:"#fef2f2"},
      dark:{id:"red", className:"theme-red", accent:"#dc2626", strong:"#f87171", deep:"#b91c1c", rgb:"220,38,38", strongRgb:"248,113,113", glowRgb:"239,68,68", sheenRgb:"254,202,202", link:"#fecaca", swatchA:"#dc2626", swatchB:"#f87171"},
    },
    {
      family:"silver",
      label:"Silver",
      light:{id:"lightSilver", className:"theme-light-silver", accent:"#64748b", strong:"#94a3b8", deep:"#475569", rgb:"100,116,139", strongRgb:"148,163,184", glowRgb:"148,163,184", sheenRgb:"203,213,225", link:"#475569", swatchA:"#f8fafc", swatchB:"#94a3b8", browserColor:"#f8fafc"},
      dark:{id:"silver", className:"theme-silver", accent:"#94a3b8", strong:"#e2e8f0", deep:"#64748b", rgb:"148,163,184", strongRgb:"226,232,240", glowRgb:"203,213,225", sheenRgb:"241,245,249", link:"#e2e8f0", swatchA:"#64748b", swatchB:"#e2e8f0"},
    },
  ];

  function choice(family, mode, values){
    return {
      ...values,
      family,
      mode,
      label:families.find(item => item.family === family)?.label || family,
      swatchRgb:values.rgb,
    };
  }

  const fixedChoices = families.flatMap(item => [
    choice(item.family, "light", item.light),
    choice(item.family, "dark", item.dark),
  ]);
  const adaptiveChoices = [
    {id:"albumAdaptiveLight", family:"adaptive", mode:"light", label:"Adaptive", className:"theme-light-adaptive", swatchA:"#f8fafc", swatchB:"#8db7ff", swatchRgb:"37,99,235", browserColor:"#f7f8fb"},
    {id:"albumAdaptive", family:"adaptive", mode:"dark", label:"Adaptive", className:"theme-adaptive", swatchA:"#020617", swatchB:"#8db7ff", swatchRgb:"141,183,255"},
  ];

  window.MediaPlayerThemeData = {
    defaultThemeId:"albumAdaptiveLight",
    darkAdaptiveThemeId:"albumAdaptive",
    lightAdaptiveThemeId:"albumAdaptiveLight",
    defaultAdaptiveColor:{r:63, g:111, b:216},
    choices:[adaptiveChoices[0], adaptiveChoices[1], ...fixedChoices],
  };
})();
