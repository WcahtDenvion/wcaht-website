const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
const year = document.querySelector('#year');

if (year) year.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

menuButton?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    header.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
}

// Animate live values between API refreshes without turning the page into a slot machine.
window.wcahtAnimateMetric = function (el, target, options = {}) {
  if (!el || !Number.isFinite(target)) return;
  const decimals = options.decimals || 0;
  const current = Number(el.dataset.metricValue);
  const start = Number.isFinite(current) ? current : target;
  el.dataset.metricValue = String(target);

  const render = (value) => {
    el.textContent = Number(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (reducedMotion.matches || start === target) {
    render(target);
    return;
  }

  const started = performance.now();
  const duration = 650;
  const tick = (now) => {
    const progress = Math.min((now - started) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    render(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// A thin page-progress line gives long-page movement a quiet sense of direction.
(function () {
  const bar = document.querySelector('.scroll-progress span');
  if (!bar) return;
  let queued = false;
  const update = () => {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const progress = distance > 0 ? Math.min(window.scrollY / distance, 1) : 0;
    bar.style.transform = `scaleX(${progress})`;
    queued = false;
  };
  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();

// Small pointer parallax on the wallet preview; touch and reduced-motion users get a still card.
(function () {
  const card = document.querySelector('.hero-card');
  if (!card || reducedMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
  let frame = 0;
  card.classList.add('tilt-ready');
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      card.style.setProperty('--tilt-x', `${(-y * 2.4).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 3.2).toFixed(2)}deg`);
    });
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  });
})();

// Stagger compatible-tool badges once, when the strip becomes visible.
(function () {
  const strip = document.querySelector('.evm-strip');
  if (!strip || reducedMotion.matches) return;
  strip.classList.add('logos-motion-ready');
  if (!('IntersectionObserver' in window)) {
    strip.classList.add('logos-in-view');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      strip.classList.add('logos-in-view');
      observer.disconnect();
    }
  }, { threshold: 0.35 });
  observer.observe(strip);
})();

// Live-band stat entrance runs once when the data becomes visible.
(function () {
  const band = document.querySelector('.live-band');
  if (!band) return;
  if (!('IntersectionObserver' in window)) {
    band.classList.add('in-view');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      band.classList.add('in-view');
      observer.disconnect();
    }
  }, { threshold: 0.4 });
  observer.observe(band);
})();

// Run the consensus-horizon scene only while it is on screen. The animation is
// decorative, and reduced-motion visitors always receive the stable frame.
(function () {
  const horizon = document.querySelector('.footer-horizon');
  if (!horizon || reducedMotion.matches) return;
  if (!('IntersectionObserver' in window)) {
    horizon.classList.add('is-active');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => horizon.classList.toggle('is-active', entry.isIntersecting));
  }, { threshold: 0.08 });
  observer.observe(horizon);
})();

// Cryoflux: a lightweight, original canvas field shared by the whole landing
// page. It runs at 30fps with a capped device-pixel ratio, pauses in background
// tabs, and becomes a single stable frame for reduced-motion/save-data users.
(function () {
  const canvas = document.querySelector('#cryofluxCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const staticMode = reducedMotion.matches || saveData;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const ribbons = [
    { base: .18, amp: .085, wave: 5.2, drift: .17, width: 46, colors: ['rgba(62,187,230,0)', 'rgba(87,222,248,.31)', 'rgba(102,99,226,.02)'] },
    { base: .36, amp: .11, wave: 4.1, drift: -.11, width: 24, colors: ['rgba(80,108,226,0)', 'rgba(112,128,240,.26)', 'rgba(82,217,244,0)'] },
    { base: .63, amp: .095, wave: 5.8, drift: .13, width: 38, colors: ['rgba(49,179,220,0)', 'rgba(91,216,240,.25)', 'rgba(77,98,217,0)'] },
    { base: .82, amp: .075, wave: 4.7, drift: -.09, width: 18, colors: ['rgba(75,92,218,0)', 'rgba(126,119,238,.22)', 'rgba(82,211,237,0)'] },
  ];
  const particles = Array.from({ length: window.innerWidth < 700 ? 16 : 32 }, (_, index) => ({
    ribbon: index % ribbons.length,
    offset: ((index * 47) % 101) / 101,
    speed: .018 + ((index * 13) % 11) / 550,
    size: 1.2 + ((index * 7) % 5) * .48,
    phase: index * 1.83,
  }));

  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let raf = 0;
  let lastPaint = 0;
  let pointerX = .72;
  let pointerY = .38;
  let targetX = pointerX;
  let targetY = pointerY;
  let scrollPhase = 0;

  const resize = () => {
    width = Math.max(window.innerWidth, 1);
    height = Math.max(window.innerHeight, 1);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  };

  const pointY = (ribbon, x, seconds) => {
    const progress = x / Math.max(width, 1);
    const pointerPull = (pointerY - .5) * height * .08;
    return height * ribbon.base
      + Math.sin(progress * ribbon.wave + seconds * ribbon.drift + scrollPhase) * height * ribbon.amp
      + Math.sin(progress * 10.5 - seconds * ribbon.drift * .7) * height * .018
      + pointerPull;
  };

  const traceRibbon = (ribbon, seconds) => {
    ctx.beginPath();
    for (let x = -60; x <= width + 60; x += 28) {
      const y = pointY(ribbon, x, seconds);
      if (x === -60) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };

  const draw = (now) => {
    if (!width || !height) return;
    const seconds = now / 1000;
    pointerX += (targetX - pointerX) * .04;
    pointerY += (targetY - pointerY) * .04;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ribbons.forEach((ribbon, index) => {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, ribbon.colors[0]);
      gradient.addColorStop(Math.max(.25, Math.min(.72, pointerX)), ribbon.colors[1]);
      gradient.addColorStop(1, ribbon.colors[2]);

      traceRibbon(ribbon, seconds + index * 2.7);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = ribbon.width;
      ctx.globalAlpha = .52;
      ctx.stroke();

      traceRibbon(ribbon, seconds + index * 2.7);
      ctx.strokeStyle = index % 2 ? 'rgba(153,166,255,.28)' : 'rgba(184,244,255,.34)';
      ctx.lineWidth = .8;
      ctx.globalAlpha = .72;
      ctx.stroke();
    });

    particles.forEach((particle) => {
      const ribbon = ribbons[particle.ribbon];
      const progress = (particle.offset + seconds * particle.speed) % 1;
      const x = progress * (width + 120) - 60;
      const y = pointY(ribbon, x, seconds + particle.ribbon * 2.7);
      const pulse = .45 + Math.sin(seconds * 1.8 + particle.phase) * .25;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4 + Math.sin(seconds * .4 + particle.phase) * .22);
      ctx.globalAlpha = Math.max(.08, pulse);
      ctx.fillStyle = particle.ribbon % 2 ? '#a8b8ff' : '#c9f8ff';
      ctx.shadowColor = particle.ribbon % 2 ? '#6f75ff' : '#56dfff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    });
    ctx.restore();

    frame += 1;
    if (frame % 15 === 0) canvas.dataset.frame = String(frame);
  };

  const animate = (now) => {
    if (document.hidden || staticMode) return;
    raf = requestAnimationFrame(animate);
    if (now - lastPaint < 33) return;
    lastPaint = now;
    draw(now);
  };

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  }, { passive: true });
  window.addEventListener('scroll', () => {
    scrollPhase = window.scrollY * .00045;
  }, { passive: true });
  if (finePointer && !staticMode) {
    window.addEventListener('pointermove', (event) => {
      targetX = event.clientX / Math.max(window.innerWidth, 1);
      targetY = event.clientY / Math.max(window.innerHeight, 1);
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !staticMode) raf = requestAnimationFrame(animate);
  });

  canvas.dataset.motion = staticMode ? 'static' : 'running';
  resize();
  if (!staticMode) raf = requestAnimationFrame(animate);
})();

// A small local refraction follows the pointer across glass surfaces. This is
// deliberately disabled for touch and reduced-motion visitors.
(function () {
  if (reducedMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
  const surfaces = document.querySelectorAll('.hero-card.hero-ice-art, .flow-route article, .features-rich .feat');
  surfaces.forEach((surface) => {
    surface.addEventListener('pointermove', (event) => {
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty('--glint-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
      surface.style.setProperty('--glint-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
    });
    surface.addEventListener('pointerleave', () => {
      surface.style.setProperty('--glint-x', '50%');
      surface.style.setProperty('--glint-y', '50%');
    });
  });
})();

// Validator constellation: a distributed mesh of independent nodes with
// softly moving consensus signals. The scene intentionally has no central hub.
(function () {
  const canvas = document.querySelector('#validatorConstellationCanvas');
  const section = canvas?.closest('.validator-vision');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const staticMode = reducedMotion.matches || saveData;
  const palette = [
    [78, 220, 255],
    [72, 142, 255],
    [132, 112, 246],
    [224, 91, 202],
    [255, 194, 88],
    [70, 224, 171],
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let links = [];
  let raf = 0;
  let resizeRaf = 0;
  let lastPaint = 0;
  let active = false;

  const noise = (index, salt) => {
    const value = Math.sin(index * 73.137 + salt * 41.731) * 43758.5453;
    return value - Math.floor(value);
  };

  const buildNetwork = () => {
    const count = width < 700 ? 20 : 38;
    nodes = Array.from({ length: count }, (_, index) => ({
      x: (.035 + noise(index, 1) * .93) * width,
      y: (.08 + noise(index, 2) * .84) * height,
      vx: (noise(index, 3) - .5) * (width < 700 ? 2.4 : 4.2),
      vy: (noise(index, 4) - .5) * (width < 700 ? 1.8 : 3.1),
      radius: 1.25 + noise(index, 5) * 2.5,
      phase: noise(index, 6),
      color: palette[index % palette.length],
    }));

    const unique = new Set();
    links = [];
    nodes.forEach((node, index) => {
      const nearest = nodes
        .map((other, otherIndex) => ({
          otherIndex,
          distance: otherIndex === index ? Infinity : Math.hypot(node.x - other.x, node.y - other.y),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, width < 700 ? 2 : 3);
      nearest.forEach(({ otherIndex }) => {
        const key = index < otherIndex ? `${index}:${otherIndex}` : `${otherIndex}:${index}`;
        if (unique.has(key)) return;
        unique.add(key);
        links.push({ from: index, to: otherIndex, phase: noise(index + otherIndex, 8) });
      });
    });
  };

  const resize = () => {
    const rect = section.getBoundingClientRect();
    width = Math.max(Math.round(rect.width), 1);
    height = Math.max(Math.round(rect.height), 1);
    dpr = Math.min(window.devicePixelRatio || 1, 1.3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNetwork();
    draw(staticMode ? 4200 : performance.now());
  };

  const draw = (now) => {
    if (!width || !height) return;
    const seconds = now / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const positions = nodes.map((node, index) => ({
      x: node.x + Math.sin(seconds * .22 + node.phase * 6.28) * node.vx + Math.cos(seconds * .11 + index) * 2,
      y: node.y + Math.cos(seconds * .18 + node.phase * 6.28) * node.vy,
    }));

    links.forEach((link, index) => {
      const from = positions[link.from];
      const to = positions[link.to];
      const source = nodes[link.from];
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const maxDistance = width < 700 ? width * .45 : width * .23;
      const strength = Math.max(0, 1 - distance / maxDistance);
      if (strength <= 0) return;
      const [red, green, blue] = source.color;
      const edge = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      edge.addColorStop(0, `rgba(${red},${green},${blue},${.05 + strength * .19})`);
      edge.addColorStop(.5, `rgba(190,239,255,${.035 + strength * .12})`);
      edge.addColorStop(1, 'rgba(116,126,246,.06)');
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = edge;
      ctx.lineWidth = .45 + strength * .75;
      ctx.stroke();

      if (index % 4 === 0) {
        const progress = (link.phase + seconds * (.07 + (index % 3) * .012)) % 1;
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 8);
        glow.addColorStop(0, `rgba(${red},${green},${blue},${.74 * strength})`);
        glow.addColorStop(.25, `rgba(${red},${green},${blue},${.28 * strength})`);
        glow.addColorStop(1, `rgba(${red},${green},${blue},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.beginPath();
        ctx.arc(x, y, 1.1 + strength, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(229,252,255,${.68 + strength * .3})`;
        ctx.fill();
      }
    });

    nodes.forEach((node, index) => {
      const { x, y } = positions[index];
      const [red, green, blue] = node.color;
      const pulse = .68 + Math.sin(seconds * 1.35 + node.phase * 6.28) * .2;
      const haloRadius = node.radius * (4.8 + pulse * 1.5);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
      halo.addColorStop(0, `rgba(${red},${green},${blue},${.42 + pulse * .2})`);
      halo.addColorStop(.24, `rgba(${red},${green},${blue},.16)`);
      halo.addColorStop(1, `rgba(${red},${green},${blue},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
      ctx.beginPath();
      ctx.arc(x, y, node.radius * (.82 + pulse * .18), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${red},${green},${blue},${.66 + pulse * .25})`;
      ctx.fill();

      if (index % 9 === 0) {
        const join = (seconds * .18 + node.phase) % 1;
        ctx.beginPath();
        ctx.arc(x, y, node.radius * 2 + join * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${red},${green},${blue},${(1 - join) * .24})`;
        ctx.lineWidth = .8;
        ctx.stroke();
      }
    });

    ctx.restore();
    canvas.dataset.frame = String(Math.floor(now));
  };

  const animate = (now) => {
    if (!active || document.hidden || staticMode) return;
    raf = requestAnimationFrame(animate);
    if (now - lastPaint < 33) return;
    lastPaint = now;
    draw(now);
  };

  const setActive = (next) => {
    active = next;
    canvas.dataset.motion = staticMode ? 'static' : (active ? 'running' : 'paused');
    cancelAnimationFrame(raf);
    if (active && !staticMode && !document.hidden) raf = requestAnimationFrame(animate);
  };

  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (active && !staticMode) raf = requestAnimationFrame(animate);
  });

  resize();
  if (staticMode) {
    setActive(false);
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      setActive(entries.some((entry) => entry.isIntersecting));
    }, { threshold: .06 });
    observer.observe(section);
  } else {
    setActive(true);
  }
})();

// Ledger flight: crystalline block fragments move from a central finality core
// toward the viewer. The scene only runs while its section is visible, caps its
// pixel density and frame rate, and renders one deterministic still frame when
// reduced motion or Save-Data is enabled.
(function () {
  const canvas = document.querySelector('#ledgerFlightCanvas');
  const section = canvas?.closest('.ledger-flight');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const staticMode = reducedMotion.matches || saveData;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const palette = [
    [79, 219, 255],
    [65, 132, 255],
    [126, 103, 255],
    [226, 83, 205],
    [255, 125, 78],
    [255, 204, 91],
    [65, 224, 166],
    [221, 247, 255],
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let shards = [];
  let raf = 0;
  let resizeRaf = 0;
  let lastPaint = 0;
  let frame = 0;
  let active = false;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  const noise = (index, salt) => {
    const value = Math.sin(index * 91.173 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  };

  const buildShards = () => {
    const count = width < 700 ? 42 : 92;
    shards = Array.from({ length: count }, (_, index) => {
      const ring = index / count;
      const angle = ring * Math.PI * 2 + (noise(index, 1) - .5) * .23;
      return {
        angle,
        offset: noise(index, 2),
        speed: .045 + noise(index, 3) * .075,
        length: 24 + noise(index, 4) * 104,
        thickness: 2.4 + noise(index, 5) * 17,
        twist: (noise(index, 6) - .5) * .34,
        lane: (noise(index, 7) - .5) * .13,
        color: palette[index % palette.length],
        outline: index % 7 === 0,
      };
    });
  };

  const resize = () => {
    const rect = section.getBoundingClientRect();
    width = Math.max(Math.round(rect.width), 1);
    height = Math.max(Math.round(rect.height), 1);
    dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildShards();
    draw(staticMode ? 6400 : performance.now());
  };

  const draw = (now) => {
    if (!width || !height) return;
    const seconds = now / 1000;
    pointerX += (targetX - pointerX) * .045;
    pointerY += (targetY - pointerY) * .045;
    const centerX = width * (.5 + pointerX * .018);
    const centerY = height * (.47 + pointerY * .018);
    const reach = Math.hypot(width, height) * .68;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    shards.forEach((shard, index) => {
      const progress = (shard.offset + seconds * shard.speed) % 1;
      const depth = Math.pow(progress, 1.45);
      const angle = shard.angle + shard.lane * Math.sin(seconds * .23 + index);
      const distance = 24 + depth * reach;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance * .73;
      const length = shard.length * (.17 + depth * 2.05);
      const thickness = shard.thickness * (.24 + depth * 1.18);
      const fadeIn = Math.min(progress / .12, 1);
      const fadeOut = Math.min((1 - progress) / .16, 1);
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * (.26 + depth * .76);
      const [red, green, blue] = shard.color;

      const tailDistance = Math.max(12, length * (1.25 + depth));
      const tailX = x - Math.cos(angle) * tailDistance;
      const tailY = y - Math.sin(angle) * tailDistance * .73;
      const trail = ctx.createLinearGradient(tailX, tailY, x, y);
      trail.addColorStop(0, `rgba(${red},${green},${blue},0)`);
      trail.addColorStop(1, `rgba(${red},${green},${blue},${alpha * .52})`);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = trail;
      ctx.lineWidth = Math.max(.5, thickness * .18);
      ctx.stroke();

      if (index % 4 === 0 && progress > .1) {
        const beadDistance = tailDistance * .32;
        const beadX = x - Math.cos(angle) * beadDistance;
        const beadY = y - Math.sin(angle) * beadDistance * .73;
        ctx.beginPath();
        ctx.arc(beadX, beadY, Math.max(1, thickness * .13), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${red},${green},${blue},${alpha * .88})`;
        ctx.fill();
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + shard.twist);
      const fill = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
      fill.addColorStop(0, `rgba(${red},${green},${blue},${alpha * .24})`);
      fill.addColorStop(.52, `rgba(${Math.min(red + 34, 255)},${Math.min(green + 24, 255)},${Math.min(blue + 12, 255)},${alpha})`);
      fill.addColorStop(1, `rgba(${red},${green},${blue},${alpha * .36})`);

      if (shard.outline) {
        ctx.strokeStyle = fill;
        ctx.lineWidth = Math.max(.7, 1.2 * depth);
        ctx.strokeRect(-length / 2, -thickness / 2, length, thickness);
      } else {
        ctx.fillStyle = fill;
        ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
        ctx.fillStyle = `rgba(236,251,255,${alpha * .5})`;
        ctx.fillRect(-length * .42, -thickness * .42, length * .64, Math.max(.45, thickness * .08));
      }
      ctx.restore();
    });

    const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * .2);
    core.addColorStop(0, 'rgba(197,247,255,.16)');
    core.addColorStop(.28, 'rgba(65,194,231,.055)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    frame += 1;
    if (frame % 15 === 0) canvas.dataset.frame = String(frame);
  };

  const animate = (now) => {
    if (!active || document.hidden || staticMode) return;
    raf = requestAnimationFrame(animate);
    if (now - lastPaint < 33) return;
    lastPaint = now;
    draw(now);
  };

  const setActive = (next) => {
    active = next;
    canvas.dataset.motion = staticMode ? 'static' : (active ? 'running' : 'paused');
    cancelAnimationFrame(raf);
    if (active && !staticMode && !document.hidden) raf = requestAnimationFrame(animate);
  };

  if (finePointer && !staticMode) {
    section.addEventListener('pointermove', (event) => {
      const rect = section.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    }, { passive: true });
    section.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
    });
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (active && !staticMode) {
      raf = requestAnimationFrame(animate);
    }
  });

  resize();
  if (staticMode) {
    setActive(false);
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      setActive(entries.some((entry) => entry.isIntersecting));
    }, { threshold: .06 });
    observer.observe(section);
  } else {
    setActive(true);
  }
})();
