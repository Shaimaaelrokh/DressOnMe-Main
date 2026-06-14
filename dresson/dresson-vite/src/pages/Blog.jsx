import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import rec1 from '../assets/rec1.mp4'
import rec2 from '../assets/rec2.mp4'
import rec3 from '../assets/rec3.mp4'
import rec4 from '../assets/rec4.mp4'


// ─── CSS injected as a string ─────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400;1,600&family=Barlow:wght@300;400;600;700;800;900&display=swap');

/* ── variables: html+:root for max specificity, flat values (no var refs) ── */
html, :root {
  --black:     #080909;
  --black-2:   #0f1010;
  --char:      #1a1c1b;
  --char-2:    #3a3e38;
  --gun:       #2e3330;
  --gun-md:    #404540;
  --gun-lt:    #6b7568;
  --silver-dk: #8a9890;
  --silver-md: #b2bfb8;
  --silver-lt: #ccd8d0;
  --silver:    #dde8e2;
  --white:     #f6f9f7;
  --white-2:   #edf2ef;
  --gold:      #c9a84c;
  --gold-dk:   #a8832e;
  --gold-lt:   #dfc06a;
  --gold-pale: #f0dfa0;
  --nabi:      #4a7c5f;
  --nabi-dk:   #325444;
  --nabi-lt:   #6aaa85;
  --nabi-pale: #aecfba;
  /* flat aliases — no var() chaining to avoid framework override */
  --gray-dk:   #6b7568;
  --gray-md:   #8a9890;
  --gray-lt:   #b2bfb8;
  --bot:       #4a7c5f;
  --bot-dk:    #325444;
  --bot-lt:    #6aaa85;
  --bot-pale:  #aecfba;
  --blue-lt:   #6aaa85;
  --blue-pale: #ccd8d0;
}

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

.dom-root {
  background: var(--black);
  color: var(--white);
  font-family: 'Barlow', sans-serif;
  overflow-x: hidden;
  cursor: none;
}

/* ── CURSOR ── */
.dom-cursor {
  width: 12px; height: 12px;
  background: var(--gold);
  border-radius: 50%;
  position: fixed; pointer-events: none; z-index: 9999;
  transition: transform 0.12s;
  mix-blend-mode: difference;
}
.dom-ring {
  width: 36px; height: 36px;
  border: 1px solid rgba(212,175,85,0.5);
  border-radius: 50%;
  position: fixed; pointer-events: none; z-index: 9998;
  transition: transform 0.2s;
}

/* ── NAV ── */
.dom-nav {
  position: fixed; top: 0; left: 0; right: 0;
  padding: 22px 64px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 100;
  background: linear-gradient(180deg, rgba(11,12,11,0.97) 0%, transparent 100%);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(212,175,85,0.06);
}
.dom-logo {
  font-family: 'Barlow', sans-serif;
  font-weight: 800; font-size: 18px; letter-spacing: 4px;
  color: var(--white);
  display: flex; align-items: center; gap: 10px;
}
.dom-logo-gem { color: var(--gold); font-size: 14px; filter: drop-shadow(0 0 6px rgba(212,175,85,0.6)); }
.dom-nav-links { display: flex; gap: 36px; list-style: none; align-items: center; }
.dom-nav-links a {
  color: var(--gray-md); text-decoration: none;
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase; transition: color 0.3s;
  white-space: nowrap;
}
.dom-nav-links a:hover { color: var(--white); }
.dom-nav-cta {
  color: var(--gold) !important;
  border: 1px solid rgba(212,175,85,0.45) !important;
  padding: 9px 26px; border-radius: 2px;
  font-weight: 700 !important; letter-spacing: 2px;
  transition: all 0.3s !important;
  white-space: nowrap;
}
.dom-nav-cta:hover {
  background: rgba(212,175,85,0.08) !important;
  border-color: var(--gold) !important;
  color: var(--gold-pale) !important;
}

/* ── HERO ── */
.dom-hero {
  min-height: 100vh;
  display: flex; align-items: center;
  padding: 0 64px;
  position: relative; overflow: hidden;
}
.dom-hero-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 65% 70% at 72% 38%, rgba(74,124,95,0.20) 0%, transparent 65%),
    radial-gradient(ellipse 50% 55% at 15% 75%, rgba(201,168,76,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 85% 80%, rgba(168,181,174,0.06) 0%, transparent 55%);
}
.dom-noise {
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  opacity: 0.5;
}
.dom-hero-grid {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(212,175,85,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212,175,85,0.03) 1px, transparent 1px);
  background-size: 80px 80px;
}
.dom-hero-content {
  width: 48%; position: relative; z-index: 2;
  animation: domFadeInUp 1s ease forwards;
}
.dom-eyebrow {
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--gray-dk); margin-bottom: 20px; font-weight: 400;
  display: flex; align-items: center; gap: 14px;
}
.dom-eyebrow-line {
  display: block; width: 32px; height: 1px;
  background: linear-gradient(90deg, var(--gold), transparent);
  flex-shrink: 0;
}
.dom-hero-title {
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(54px, 6.5vw, 106px);
  line-height: 0.9; text-transform: uppercase;
  letter-spacing: -2px; margin-bottom: 30px;
  display: flex; flex-direction: column;
}
.dom-hero-we {
  font-size: 0.32em; letter-spacing: 8px; font-weight: 300;
  color: var(--gray-dk); margin-bottom: 4px;
}
.dom-gradient-text {
  background: linear-gradient(135deg, var(--gold-dk) 0%, var(--gold) 45%, var(--gold-lt) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px rgba(212,175,85,0.25));
}
.dom-white-text { color: var(--white-2); }
.dom-hero-sub {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 18px; line-height: 1.85;
  color: var(--gray-md); max-width: 440px; margin-bottom: 48px;
}
.dom-hero-actions { display: flex; align-items: center; gap: 20px; }
.dom-btn-primary {
  background: linear-gradient(135deg, var(--gold-dk), var(--gold), var(--gold-lt));
  color: var(--black); padding: 14px 38px; border-radius: 2px;
  font-size: 12px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
  text-decoration: none;
  box-shadow: 0 0 28px rgba(212,175,85,0.25), 0 8px 30px rgba(0,0,0,0.4);
  transition: all 0.3s; display: inline-block;
}
.dom-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 0 48px rgba(212,175,85,0.45), 0 12px 40px rgba(0,0,0,0.5); }
.dom-btn-outline {
  border: 1px solid rgba(200,204,196,0.25); color: var(--gray-lt);
  padding: 14px 38px; border-radius: 2px;
  font-size: 12px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase;
  text-decoration: none; transition: all 0.3s; display: inline-block;
}
.dom-btn-outline:hover { border-color: var(--gray-lt); background: rgba(200,204,196,0.05); color: var(--white); }

/* Hero video */
.dom-hero-video {
  position: absolute; right: -30px; top: 50%;
  transform: translateY(-50%);
  width: 50%; z-index: 2;
  animation: domFloatIn 1.3s ease forwards;
}
.dom-video-glow {
  position: absolute; inset: -60px; pointer-events: none; z-index: -1;
  background:
    radial-gradient(ellipse 55% 50% at 50% 50%, rgba(74,124,95,0.2) 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 30% 70%, rgba(201,168,76,0.12) 0%, transparent 60%);
}
.dom-video-frame { position: relative; }
.dom-video-corner {
  position: absolute; width: 22px; height: 22px; z-index: 3;
  border-color: var(--gold); border-style: solid; opacity: 0.7;
}
.dom-corner-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.dom-corner-tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
.dom-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
.dom-corner-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
.dom-video-wrapper {
  border-radius: 4px; overflow: hidden;
  box-shadow:
    0 0 60px rgba(74,124,95,0.22),
    0 0 120px rgba(201,168,76,0.10),
    0 40px 80px rgba(0,0,0,0.75);
  border: 1px solid rgba(201,168,76,0.15);
}
.dom-video-wrapper video {
  width: 100%; height: auto;
  display: block;
  object-fit: contain;
}

.dom-hero-social {
  position: absolute; left: 64px; bottom: 60px;
  display: flex; gap: 24px; z-index: 2;
}
.dom-hero-social a {
  color: rgba(200,204,196,0.3); text-decoration: none;
  font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase;
  transition: color 0.3s, transform 0.3s;
}
.dom-hero-social a:hover { color: var(--gold); transform: translateY(-3px); }

.dom-scroll-hint {
  position: absolute; left: 50%; bottom: 48px;
  transform: translateX(-50%); z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  animation: domBounce 2.4s infinite;
}
.dom-scroll-hint span {
  font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: var(--gray-dk);
}
.dom-scroll-circle {
  border: 1px solid rgba(212,175,85,0.25); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--gray-dk); font-size: 16px;
}

/* ── SECTION BG TEXT ── */
.dom-section-bg-text {
  position: absolute; right: 0; top: 0;
  pointer-events: none; user-select: none;
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(80px, 13vw, 210px);
  text-transform: uppercase; letter-spacing: -6px; line-height: 1;
  color: transparent;
  -webkit-text-stroke: 2px rgba(212,175,85,0.15);
  filter: drop-shadow(0 12px 32px rgba(74,124,95,0.6)) drop-shadow(0 8px 16px rgba(201,168,76,0.4));
}

/* ── MARQUEE ── */
.dom-marquee-section {
  padding: 36px 0; overflow: hidden;
  border-top: 1px solid rgba(212,175,85,0.1);
  border-bottom: 1px solid rgba(212,175,85,0.1);
  background: linear-gradient(90deg, rgba(74,124,95,0.12), rgba(74,124,95,0.08), rgba(74,124,95,0.12));
}
.dom-marquee-track {
  display: flex; gap: 56px;
  animation: domMarquee 24s linear infinite;
  white-space: nowrap;
}
.dom-marquee-item {
  font-family: 'Barlow', sans-serif; font-weight: 800;
  font-size: 13px; letter-spacing: 5px; text-transform: uppercase;
  color: rgba(200,204,196,0.12); flex-shrink: 0;
  display: flex; align-items: center; gap: 16px;
}
.dom-marquee-hl { color: rgba(212,175,85,0.38); }
.dom-marquee-gem { font-size: 10px; color: var(--gold-dk); opacity: 0.5; }

/* ── ABOUT ── */
.dom-about {
  min-height: 100vh; display: flex; align-items: center;
  padding: 130px 64px; position: relative; overflow: hidden;
  background: linear-gradient(180deg, var(--black) 0%, rgba(50,84,68,0.4) 50%, var(--black) 100%);
}
.dom-about-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 80px; align-items: center; width: 100%; position: relative; z-index: 2;
}
.dom-about-video { position: relative; max-width: 550px; overflow: visible; }
.dom-about-video-inner {
  border-radius: 4px; overflow: hidden;
  box-shadow:
    0 0 50px rgba(74,124,95,0.22),
    0 0 100px rgba(168,181,174,0.08),
    0 30px 60px rgba(0,0,0,0.65);
  border: 1px solid rgba(201,168,76,0.12);
  transform: rotate(-10deg); transition: transform 0.6s ease;
}
.dom-about-video-inner:hover { transform: rotate(0deg) scale(1.02); }
.dom-about-video-inner video {
  width: 100%; height: auto;
  display: block;
  object-fit: contain;
}
.dom-about-badge {
  position: absolute; top: -90px; right: 35px; z-index: 3;
  width: 84px; height: 84px; border-radius: 50%;
  background: linear-gradient(135deg, var(--nabi-dk), var(--nabi));
  border: 2px solid rgba(201,168,76,0.35);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  box-shadow: 0 0 24px rgba(74,124,95,0.45);
  transform: rotate(-10deg);
  transition: transform 0.6s ease;
}
.dom-about-video-inner:hover ~ .dom-about-badge {
  transform: rotate(-10deg);
}
.dom-badge-gem { color: var(--gold); font-size: 12px; margin-bottom: 2px; }
.dom-badge-text {
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; line-height: 1.4; text-align: center; color: var(--bot-pale);
}
.dom-section-label {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--bot-lt); font-weight: 600; margin-bottom: 18px;
  display: flex; align-items: center; gap: 14px;
}
.dom-section-label::before {
  content: ''; display: block; width: 28px; height: 1px;
  background: linear-gradient(90deg, var(--gold), var(--bot-lt));
}
.dom-about-title {
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(28px, 3.5vw, 48px); line-height: 1.08;
  margin-bottom: 26px; text-transform: uppercase; letter-spacing: -0.5px;
}
.dom-about-title em {
  background: linear-gradient(135deg, var(--gold-dk), var(--gold-lt));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-style: normal;
}
.dom-about-desc {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 17px; line-height: 2; color: var(--gray-md); margin-bottom: 44px;
}
.dom-stats-row { display: flex; gap: 36px; }
.dom-stat { border-left: 1px solid rgba(212,175,85,0.25); padding-left: 20px; }
.dom-stat-num {
  font-family: 'Barlow', sans-serif; font-weight: 900; font-size: 32px;
  background: linear-gradient(135deg, var(--gold-dk), var(--gold-lt));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.dom-stat-label {
  font-size: 10px; color: var(--gray-dk); letter-spacing: 2px;
  text-transform: uppercase; margin-top: 6px;
}

/* ── REVOLUTION ── */
.dom-revolution {
  padding: 130px 64px; position: relative; overflow: hidden; 
  background: linear-gradient(180deg, var(--black) 0%, rgba(50,84,68,0.25) 50%, var(--black) 100%);
}
.dom-rev-header { text-align: center; margin-bottom: 90px; position: relative; z-index: 2; }
.dom-cta-eyebrow {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blue-lt); font-weight: 600; margin-bottom: 24px;
  display: flex; align-items: center; justify-content: center; gap: 14px;
}
.dom-rev-title {
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(44px, 7.5vw, 112px);
  text-transform: uppercase; letter-spacing: -3px; line-height: 0.88;
  background: linear-gradient(160deg, var(--white) 0%, var(--gray-lt) 25%, var(--gold) 55%, var(--bot-pale) 80%, var(--blue-pale) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.dom-rev-sub {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 17px; color: var(--gray-dk);
  max-width: 580px; margin: 28px auto 0; line-height: 1.9;
}
.dom-rev-content {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 64px; align-items: center; position: relative; z-index: 2;
}
.dom-rev-video-inner {
  border-radius: 4px; overflow: hidden;
  box-shadow:
    0 0 60px rgba(74,124,95,0.22),
    0 0 120px rgba(168,181,174,0.08),
    0 40px 80px rgba(0,0,0,0.7);
  border: 1px solid rgba(106,170,133,0.18);
  max-width: 550px;
}
.dom-rev-video-inner video {
  width: 100%; height: auto;
  display: block;
  object-fit: contain;
}
.dom-features-list { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.dom-feature-item {
  display: flex; align-items: flex-start; gap: 18px;
  padding: 22px 24px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(212,175,85,0.08);
  border-left: 2px solid rgba(212,175,85,0.2);
  border-radius: 3px; transition: all 0.4s ease;
}
.dom-feature-item:hover {
  background: rgba(74,124,95,0.07);
  border-color: rgba(201,168,76,0.3);
  border-left-color: var(--gold);
  transform: translateX(6px);
}
.dom-feature-icon {
  width: 44px; height: 44px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(212,175,85,0.08), rgba(37,99,176,0.08));
  border: 1px solid rgba(212,175,85,0.2);
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--gold);
}
.dom-feature-text h3 {
  font-family: 'Barlow', sans-serif; font-weight: 700;
  font-size: 15px; margin-bottom: 7px; color: var(--white-2);
}
.dom-feature-text p {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 15px; color: var(--gray-dk); line-height: 1.75;
}

/* ── SHOWCASE (rec4) ── */
.dom-showcase {
  padding: 130px 64px; position: relative; overflow: hidden;
  background: linear-gradient(180deg, var(--black-2) 0%, rgba(50,84,68,0.35) 50%, var(--black-2) 100%);
}
.dom-showcase-header {
  text-align: center; margin-bottom: 72px; position: relative; z-index: 2;
}
.dom-showcase-eyebrow {
  font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--gold-lt); font-weight: 600; margin-bottom: 20px;
  display: flex; align-items: center; justify-content: center; gap: 14px;
}
.dom-showcase-eyebrow::before,
.dom-showcase-eyebrow::after {
  content: ''; display: block; width: 40px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.dom-showcase-title {
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(36px, 5.5vw, 80px);
  text-transform: uppercase; letter-spacing: -2px; line-height: 0.92;
  background: linear-gradient(135deg, var(--silver-lt) 0%, var(--white) 30%, var(--gold) 65%, var(--nabi-pale) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 20px;
}
.dom-showcase-sub {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 17px; color: var(--silver-dk);
  max-width: 560px; margin: 0 auto; line-height: 1.9;
}
.dom-showcase-video-wrap {
  position: relative; z-index: 2; max-width: 520px; margin: 0 auto;
}
.dom-showcase-glow {
  position: absolute; inset: -80px; pointer-events: none; z-index: -1;
  background:
    radial-gradient(ellipse 70% 60% at 50% 50%, rgba(74,124,95,0.16) 0%, transparent 65%),
    radial-gradient(ellipse 50% 45% at 20% 80%, rgba(201,168,76,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 80% 20%, rgba(168,181,174,0.08) 0%, transparent 60%);
}
.dom-showcase-frame {
  position: relative;
  border-radius: 6px; overflow: hidden;
  box-shadow:
    0 0 80px rgba(74,124,95,0.25),
    0 0 160px rgba(201,168,76,0.10),
    0 50px 100px rgba(0,0,0,0.8);
  border: 1px solid rgba(201,168,76,0.18);
}
.dom-showcase-corner {
  position: absolute; width: 28px; height: 28px; z-index: 3;
  border-color: var(--gold-lt); border-style: solid; opacity: 0.8;
}
.dom-sc-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
.dom-sc-tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
.dom-sc-bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
.dom-sc-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
.dom-showcase-frame video {
  width: 100%; height: auto;
  display: block;
  object-fit: contain;
}
.dom-showcase-badge-row {
  display: flex; justify-content: center; gap: 32px; margin-top: 40px;
  flex-wrap: wrap; position: relative; z-index: 2;
}
.dom-showcase-badge {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 22px;
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 2px; background: rgba(201,168,76,0.04);
  font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--silver-md); font-weight: 600;
}
.dom-showcase-badge span { color: var(--gold-lt); font-size: 13px; }

/* ── FOOTER CTA ── */
.dom-footer-cta {
  padding: 150px 64px; text-align: center;
  position: relative; overflow: hidden;
  background: linear-gradient(180deg, var(--black) 0%, var(--black-2) 50%, var(--black) 100%);
}
.dom-footer-cta-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 70% 55% at 50% 50%, rgba(74,124,95,0.10) 0%, transparent 65%),
    radial-gradient(ellipse 40% 40% at 20% 80%, rgba(201,168,76,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 35% 35% at 80% 20%, rgba(168,181,174,0.06) 0%, transparent 55%);
}
.dom-cta-title {
  font-family: 'Barlow', sans-serif; font-weight: 900;
  font-size: clamp(38px, 7vw, 90px);
  text-transform: uppercase; letter-spacing: -2px; line-height: 0.93;
  margin-bottom: 32px; position: relative; z-index: 2; color: var(--white);
}
.dom-cta-line2 {
  background: linear-gradient(135deg, var(--gold-dk), var(--gold), var(--bot-pale));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.dom-cta-sub {
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 18px; color: var(--gray-dk);
  max-width: 520px; margin: 0 auto 54px; line-height: 1.9;
  position: relative; z-index: 2;
}
.dom-cta-actions { display: flex; justify-content: center; gap: 20px; position: relative; z-index: 2; }

/* ── FOOTER ── */
.dom-footer {
  padding: 36px 64px;
  border-top: 1px solid rgba(212,175,85,0.08);
  display: flex; justify-content: space-between; align-items: center;
  background: var(--black-2);
}
.dom-footer-copy { font-size: 12px; color: var(--char-2); letter-spacing: 1px; }
.dom-footer-tag { font-size: 10px; color: rgba(212,175,85,0.2); letter-spacing: 4px; text-transform: uppercase; }

/* ── SCROLL REVEAL ── */
.dom-reveal { opacity: 0; transform: translateY(48px); transition: opacity 0.85s ease, transform 0.85s ease; }
.dom-reveal.dom-visible { opacity: 1; transform: translateY(0); }

/* ── KEYFRAMES ── */
@keyframes domFadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes domFloatIn {
  from { opacity: 0; transform: translateY(-50%) translateX(70px); }
  to   { opacity: 1; transform: translateY(-50%) translateX(0); }
}
@keyframes domBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(10px); }
}
@keyframes domMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ── RESPONSIVENESS ── */
@media (max-width: 1024px) {
  .dom-cursor, .dom-ring { display: none !important; }
  .dom-root { cursor: auto; }
  .dom-hero-content { width: 55%; }
  .dom-hero-video { width: 45%; right: 0; }
  .dom-hero-title { font-size: clamp(40px, 5vw, 60px); }
  .dom-about-grid { gap: 40px; }
  .dom-rev-content { gap: 40px; }
}

@media (max-width: 768px) {
  .dom-nav { padding: 15px 20px; flex-wrap: wrap; justify-content: center; gap: 15px; }
  .dom-nav-links { gap: 15px; flex-wrap: nowrap; justify-content: center; }
  
  .dom-hero { padding: 120px 20px 60px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .dom-hero-content { width: 100%; display: flex; flex-direction: column; align-items: center; }
  .dom-eyebrow { justify-content: center; }
  .dom-hero-sub { margin-left: auto; margin-right: auto; }
  .dom-hero-actions { justify-content: center; width: 100%; flex-wrap: wrap; }
  .dom-btn-primary, .dom-btn-outline { width: 100%; text-align: center; }
  
  .dom-hero-video { position: relative; width: 90%; max-width: 350px; right: auto; top: auto; transform: none; margin-top: 50px; animation: domFadeInUp 1.3s ease forwards; }
  .dom-hero-social { position: relative; left: auto; bottom: auto; margin-top: 40px; justify-content: center; width: 100%; }
  .dom-scroll-hint { display: none; }
  
  .dom-section-bg-text { font-size: clamp(50px, 15vw, 100px); top: 10px; }
  
  .dom-about { padding: 80px 20px; }
  .dom-about-grid { grid-template-columns: 1fr; text-align: center; }
  .dom-section-label { justify-content: center; }
  .dom-section-label::before { display: none; }
  .dom-stats-row { justify-content: center; flex-wrap: wrap; gap: 25px; }
  .dom-stat { border-left: none; padding-left: 0; border-top: 1px solid rgba(212,175,85,0.25); padding-top: 15px; }
  .dom-about-video { margin: 0 auto; order: -1; }
  .dom-about-badge { right: 10px; top: -40px; transform: scale(0.8) rotate(-10deg); }
  
  .dom-revolution { padding: 80px 20px; }
  .dom-rev-header { margin-bottom: 50px; }
  .dom-rev-title { font-size: clamp(32px, 8vw, 60px); }
  .dom-rev-content { grid-template-columns: 1fr; text-align: center; }
  .dom-rev-video-inner { margin: 0 auto 40px auto; }
  .dom-feature-item { padding: 20px; flex-direction: column; align-items: center; text-align: center; }
  .dom-feature-item:hover { transform: translateY(-5px); }
  
  .dom-showcase { padding: 80px 20px; }
  .dom-showcase-title { font-size: clamp(28px, 7vw, 50px); }
  .dom-showcase-badge-row { gap: 15px; }
  
  .dom-footer-cta { padding: 80px 20px; }
  .dom-cta-title { font-size: clamp(30px, 8vw, 60px); }
  .dom-cta-actions { flex-direction: column; width: 100%; }
  .dom-cta-actions .dom-btn-primary, .dom-cta-actions .dom-btn-outline { width: 100%; }
  
  .dom-footer { padding: 25px 20px; flex-direction: column; gap: 15px; text-align: center; }
}

@media (max-width: 480px) {
  .dom-nav-links { gap: 8px; }
  .dom-nav-links a { font-size: 10px; padding: 6px 8px; }
  .dom-nav-cta { padding: 6px 10px !important; }
  .dom-hero-title { font-size: clamp(38px, 10vw, 54px); }
  .dom-hero-video { width: 100%; }
}
`

// ─── DATA ─────────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  { text: 'DRESS ON ME',       hl: false },
  { text: 'FASHION REVOLUTION', hl: true  },
  { text: 'STYLE IS WEALTH',   hl: false },
  { text: 'WEAR THE FUTURE',   hl: true  },
  { text: 'INVEST IN YOURSELF',hl: false },
  { text: 'DRESS ON ME',       hl: true  },
]

const FEATURES = [
  { icon: '✦', title: 'Professional Styling',       desc: 'Expert stylists craft a powerful visual identity that reflects your personality and ambitions.' },
  { icon: '◈', title: 'Fashion as Investment',       desc: 'We transform fashion from a spending habit into a real, sustainable source of income and growth.' },
  { icon: '⬡', title: 'Personal Brand Building',    desc: 'Position yourself exactly how you want the world to see you — and reach your goals faster.' },
  { icon: '◇', title: 'Luxury Style Consulting',    desc: "Private sessions with an elite roster of the region's top fashion and image experts." },
]

const STATS = [
  { num: '500+', label: 'Satisfied Clients'    },
  { num: '3×',   label: 'Return on Style'      },
  { num: '100%', label: 'Quality Guaranteed'   },
]

const NAV_LINKS = [
  { label: 'Home', path: '/home' },
  { label: 'Inspir your clothes', path: '/outfits' },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function DressOnMe() {
  const cursorRef = useRef(null)
  const ringRef   = useRef(null)
  const mx = useRef(0), my = useRef(0)
  const rx = useRef(0), ry = useRef(0)
  const rafRef = useRef(null)

  // Inject CSS synchronously before paint — prevents FOUC (Flash of Unstyled Content)
  useLayoutEffect(() => {
    // Remove any stale copy first
    document.querySelectorAll('style[data-dom]').forEach(el => el.remove())
    const tag = document.createElement('style')
    tag.setAttribute('data-dom', '')
    tag.textContent = CSS
    // append to end of <head> so it loads after framework styles
    document.head.appendChild(tag)
    return () => tag.remove()
  }, [])

  // Custom cursor
  useEffect(() => {
    const onMove = (e) => {
      mx.current = e.clientX
      my.current = e.clientY
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX - 6 + 'px'
        cursorRef.current.style.top  = e.clientY - 6 + 'px'
      }
    }
    window.addEventListener('mousemove', onMove)
    const loop = () => {
      rx.current += (mx.current - rx.current) * 0.12
      ry.current += (my.current - ry.current) * 0.12
      if (ringRef.current) {
        ringRef.current.style.left = rx.current - 18 + 'px'
        ringRef.current.style.top  = ry.current - 18 + 'px'
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('dom-visible'); obs.unobserve(e.target) }
      }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.dom-reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Cursor scale on interactive elements
  const lp = {
    onMouseEnter: () => {
      cursorRef.current?.style.setProperty('transform', 'scale(2)')
      ringRef.current?.style.setProperty('transform', 'scale(1.5)')
    },
    onMouseLeave: () => {
      cursorRef.current?.style.setProperty('transform', 'scale(1)')
      ringRef.current?.style.setProperty('transform', 'scale(1)')
    },
  }

  const ROOT_VARS = {
    '--black':     '#080909',
    '--black-2':   '#0f1010',
    '--char':      '#1a1c1b',
    '--char-2':    '#3a3e38',
    '--gun':       '#2e3330',
    '--gun-md':    '#404540',
    '--gun-lt':    '#6b7568',
    '--silver-dk': '#8a9890',
    '--silver-md': '#b2bfb8',
    '--silver-lt': '#ccd8d0',
    '--silver':    '#dde8e2',
    '--white':     '#f6f9f7',
    '--white-2':   '#edf2ef',
    '--gold':      '#c9a84c',
    '--gold-dk':   '#a8832e',
    '--gold-lt':   '#dfc06a',
    '--gold-pale': '#f0dfa0',
    '--nabi':      '#4a7c5f',
    '--nabi-dk':   '#325444',
    '--nabi-lt':   '#6aaa85',
    '--nabi-pale': '#aecfba',
    '--gray-dk':   '#6b7568',
    '--gray-md':   '#8a9890',
    '--gray-lt':   '#b2bfb8',
    '--bot':       '#4a7c5f',
    '--bot-dk':    '#325444',
    '--bot-lt':    '#6aaa85',
    '--bot-pale':  '#aecfba',
    '--blue-lt':   '#6aaa85',
    '--blue-pale': '#ccd8d0',
  }

  return (
    <div className="dom-root" style={ROOT_VARS}>
      {/* Cursor */}
      <div className="dom-cursor" ref={cursorRef} />
      <div className="dom-ring"   ref={ringRef}   />

      {/* ── NAV ── */}
      <nav className="dom-nav">
        <div className="dom-logo">
          <span className="dom-logo-gem">✦</span>
          DRESS ON ME
        </div>
        <ul className="dom-nav-links">
          {NAV_LINKS.map((item) => (
            <li key={item.label}>
              <Link to={item.path} className="nav-link" {...lp}>{item.label}</Link>
            </li>
          ))}
          <li><Link to="/shop" className="dom-nav-cta nav-link" {...lp}>Start Now</Link></li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section className="dom-hero" id="home">
        <div className="dom-hero-bg" />
        <div className="dom-noise" />
        <div className="dom-hero-grid" />

        <div className="dom-hero-content">
          <p className="dom-eyebrow">
            <span className="dom-eyebrow-line" />
            We Are Shaping the Future
          </p>
          <h1 className="dom-hero-title">
            <span className="dom-hero-we">WE ARE</span>
            <span className="dom-gradient-text">DRESS</span>
            <span className="dom-white-text">ON ME</span>
          </h1>
          <p className="dom-hero-sub">
            Where fashion meets finance. We are the revolution that transforms
            elegance into real opportunity — because your appearance is not a
            luxury, it is an investment.
          </p>
          <div className="dom-hero-actions" style={{ display: 'flex' }}>
            <Link to="/shop" className="dom-btn-primary" {...lp}>Discover the Revolution</Link>
            <Link to="/contact" className="dom-btn-outline" {...lp}>Learn More</Link>
          </div>
        </div>

        {/* Video 1 */}
        <div className="dom-hero-video">
          <div className="dom-video-glow" />
          <div className="dom-video-frame">
            <div className="dom-video-corner dom-corner-tl" />
            <div className="dom-video-corner dom-corner-tr" />
            <div className="dom-video-corner dom-corner-bl" />
            <div className="dom-video-corner dom-corner-br" />
            <div className="dom-video-wrapper">
              <video autoPlay muted loop playsInline src={rec1} />
            </div>
          </div>
        </div>

        <div className="dom-hero-social">
          {['Instagram', 'TikTok', 'X'].map((s) => (
            <a key={s} href="#" {...lp}>{s}</a>
          ))}
        </div>
        <div className="dom-scroll-hint">
          <div className="dom-scroll-circle">↓</div>
          <span>scroll</span>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="dom-marquee-section">
        <div className="dom-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} className={`dom-marquee-item${item.hl ? ' dom-marquee-hl' : ''}`}>
              <span className="dom-marquee-gem">✦</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section className="dom-about" id="about">
        <div className="dom-section-bg-text">ABOUT</div>
        <div className="dom-about-grid">
          {/* Video 2 */}
          <div className="dom-about-video dom-reveal">
            <div className="dom-about-badge">
              <span className="dom-badge-gem">✦</span>
              <span className="dom-badge-text">WHO<br />WE<br />ARE</span>
            </div>
            <div className="dom-about-video-inner">
              <video autoPlay muted loop playsInline src={rec2} />
            </div>
          </div>

          <div className="dom-about-text dom-reveal">
            <p className="dom-section-label">WHO WE ARE</p>
            <h2 className="dom-about-title">
              Comprehensive fashion<br />
              <em>services designed</em><br />
              for your ambitions
            </h2>
            <p className="dom-about-desc">
              Dress On Me is a pioneering platform at the intersection of high
              fashion and smart money. We believe elegance is not just a look —
              it is the language of power and opportunity. Our team transforms
              your personal style into real value and tangible financial opportunity.
            </p>
            <div className="dom-stats-row">
              {STATS.map((s) => (
                <div key={s.label} className="dom-stat">
                  <div className="dom-stat-num">{s.num}</div>
                  <div className="dom-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVOLUTION ── */}
      <section className="dom-revolution" id="revolution">
        <div className="dom-section-bg-text">REVOLUTION</div>

        <div className="dom-rev-header dom-reveal">
          <p className="dom-cta-eyebrow">WHAT WE DO</p>
          <h2 className="dom-rev-title">THE<br />REVOLUTION<br />IS HERE</h2>
          <p className="dom-rev-sub">
            We are redefining the relationship between fashion and money — because
            every decision you make about your wardrobe is, at its core, a financial decision.
          </p>
        </div>

        <div className="dom-rev-content">
          <ul className="dom-features-list dom-reveal">
            {FEATURES.map((f) => (
              <li key={f.title} className="dom-feature-item">
                <div className="dom-feature-icon">{f.icon}</div>
                <div className="dom-feature-text">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Video 3 */}
          <div className="dom-rev-video dom-reveal">
            <div className="dom-rev-video-inner">
              <video autoPlay muted loop playsInline src={rec3} />
            </div>
          </div>
        </div>
      </section>

      {/* ── SHOWCASE (rec4) ── */}
      <section className="dom-showcase" id="showcase">
        <div className="dom-section-bg-text">STYLE</div>

        <div className="dom-showcase-header dom-reveal">
          <p className="dom-showcase-eyebrow">LATEST COLLECTION</p>
          <h2 className="dom-showcase-title">THE ART<br />OF STYLE</h2>
          <p className="dom-showcase-sub">
            Every frame tells a story of elegance, power, and intention — because
            the way you dress shapes the world's perception of who you are.
          </p>
        </div>

        <div className="dom-showcase-video-wrap dom-reveal">
          <div className="dom-showcase-glow" />
          <div className="dom-showcase-frame">
            <div className="dom-showcase-corner dom-sc-tl" />
            <div className="dom-showcase-corner dom-sc-tr" />
            <div className="dom-showcase-corner dom-sc-bl" />
            <div className="dom-showcase-corner dom-sc-br" />
            <video autoPlay muted loop playsInline src={rec4} />
          </div>
          <div className="dom-showcase-badge-row dom-reveal">
            {[
              { icon: '✦', label: 'Curated Looks' },
              { icon: '◈', label: 'Expert Styling' },
              { icon: '⬡', label: 'Premium Quality' },
            ].map((b) => (
              <div key={b.label} className="dom-showcase-badge" {...lp}>
                <span>{b.icon}</span>{b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="dom-footer-cta" id="contact">
        <div className="dom-footer-cta-bg" />
        <p className="dom-cta-eyebrow dom-reveal">
          <span className="dom-eyebrow-line" />Start Your Journey
        </p>
        <h2 className="dom-cta-title dom-reveal">
          STYLE<br />
          <span className="dom-cta-line2">MEETS MONEY</span>
        </h2>
        <p className="dom-cta-sub dom-reveal">
          Join the revolution. Transform your style into power. Dress On Me is
          not just fashion — it is an entirely new way of life.
        </p>
        <div className="dom-cta-actions dom-reveal" style={{ display: 'none' }}>
          <a href="#" className="dom-btn-primary" {...lp}>Book a Consultation</a>
          <a href="#" className="dom-btn-outline" {...lp}>Explore More</a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="dom-footer">
        <div className="dom-logo">
          <span className="dom-logo-gem">✦</span>
          DRESS ON ME
        </div>
        <p className="dom-footer-copy">&copy; 2026 DRESS ON ME. All rights reserved.</p>
        <p className="dom-footer-tag">FASHION IS WEALTH</p>
      </footer>
    </div>
  )
}