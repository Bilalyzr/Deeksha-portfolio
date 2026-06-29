document.addEventListener("DOMContentLoaded", () => {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    // STABLE VIEWPORT HEIGHT — stops the mobile "scroll jumps back up" bug.
    // On phones the address bar hides/shows while scrolling, which changes 100vh
    // and resizes every full-height section, yanking the page. We freeze the
    // height in --vh-stable and only refresh it on a real WIDTH change (rotation
    // / resize), ignoring the height-only changes the address bar produces.
    const docEl = document.documentElement;
    let lastVHWidth = window.innerWidth;
    const setStableVH = () => docEl.style.setProperty('--vh-stable', window.innerHeight + 'px');
    setStableVH();
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastVHWidth) {   // ignore pure address-bar height shifts
            lastVHWidth = window.innerWidth;
            setStableVH();
        }
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
        // After an orientation flip the new innerHeight settles a frame later.
        requestAnimationFrame(() => requestAnimationFrame(setStableVH));
    });

    // 0. PRELOADER — INTERACTIVE NAME REVEAL
    const preloader = document.getElementById('preloader');
    if (preloader) {
        document.documentElement.classList.add('is-loading');
        document.body.classList.add('is-loading');

        // Split the name into per-letter spans with a staggered reveal delay
        const nameEl = preloader.querySelector('.preloader-name');
        const name = (nameEl && nameEl.dataset.name) || '';
        const frag = document.createDocumentFragment();
        Array.from(name).forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'ch' + (char === ' ' ? ' space' : '');
            span.textContent = char === ' ' ? ' ' : char;
            span.style.transitionDelay = (i * 0.045).toFixed(3) + 's';
            frag.appendChild(span);
        });
        if (nameEl) nameEl.appendChild(frag);

        // Kick off the reveal on the next frame so transitions apply
        requestAnimationFrame(() => requestAnimationFrame(() => preloader.classList.add('reveal')));

        // Interactive parallax — the name gently tracks the cursor while loading
        const inner = preloader.querySelector('.preloader-inner');
        const onPreloaderMove = (e) => {
            const dx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
            const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
            inner.style.transform =
                `translate(${dx * 14}px, ${dy * 10}px) rotateX(${-dy * 5}deg) rotateY(${dx * 6}deg)`;
        };
        if (inner && !prefersReducedMotion && !('ontouchstart' in window)) {
            window.addEventListener('mousemove', onPreloaderMove, { passive: true });
        }

        // Dismiss: lift the curtain once content is ready (and a minimum show time passed)
        let dismissed = false;
        const dismiss = () => {
            if (dismissed) return;
            dismissed = true;
            preloader.classList.add('preloader-done');
            document.documentElement.classList.remove('is-loading');
            document.body.classList.remove('is-loading');
            window.removeEventListener('mousemove', onPreloaderMove);
            setTimeout(() => { preloader.style.display = 'none'; }, 1000);
        };

        const MIN_SHOW = prefersReducedMotion ? 700 : 2700;
        let minPassed = false;
        let pageReady = document.readyState === 'complete';
        setTimeout(() => { minPassed = true; if (pageReady) dismiss(); }, MIN_SHOW);
        window.addEventListener('load', () => { pageReady = true; if (minPassed) dismiss(); });
        // Hard fallback so the loader can never trap the page
        setTimeout(dismiss, 5000);
    }


    // 1. HARDWARE ANCHORED SCROLL REVEAL DRIVER
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.05 });
    revealElements.forEach(el => revealObserver.observe(el));




    // 1c. INTERACTIVE PARTICLE NETWORK (cursor-reactive constellation)
    const canvas = document.getElementById('particle-network');
    if (canvas && !prefersReducedMotion) {
        const ctx = canvas.getContext('2d');
        let width, height, particles;
        const pointer = { x: -9999, y: -9999, active: false };
        const LINK_DISTANCE = 140;      // max distance to draw a connecting line
        const POINTER_RADIUS = 180;     // cursor influence radius

        const colorCore = '113, 133, 234';   // brandSecondary rgb
        const colorAccent = '120, 91, 216';  // brandPrimary rgb

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Density scales with viewport area, capped for performance.
            const count = Math.min(110, Math.floor((width * height) / 16000));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.6 + 0.6
            }));
        }

        function step() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Gentle drift
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Cursor attraction — nodes ease toward the pointer
                if (pointer.active) {
                    const dx = pointer.x - p.x;
                    const dy = pointer.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < POINTER_RADIUS && dist > 0) {
                        const pull = (1 - dist / POINTER_RADIUS) * 0.6;
                        p.x += (dx / dist) * pull;
                        p.y += (dy / dist) * pull;
                    }
                }

                // Draw node
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${colorCore}, 0.7)`;
                ctx.fill();

                // Link to nearby nodes
                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < LINK_DISTANCE) {
                        const alpha = (1 - dist / LINK_DISTANCE) * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(${colorAccent}, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }

                // Brighten links from the cursor to nearby nodes
                if (pointer.active) {
                    const dx = pointer.x - p.x;
                    const dy = pointer.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < POINTER_RADIUS) {
                        const alpha = (1 - dist / POINTER_RADIUS) * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(pointer.x, pointer.y);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(${colorCore}, ${alpha})`;
                        ctx.lineWidth = 0.7;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(step);
        }

        window.addEventListener('mousemove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.active = true;
        }, { passive: true });
        window.addEventListener('mouseout', () => { pointer.active = false; });
        // Keep the canvas buffer matched to the viewport so it never stretches,
        // but only regenerate the particle field on a real width change. This
        // avoids both the background "zoom" and a costly rebuild on every mobile
        // address-bar toggle while scrolling.
        let lastWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            if (window.innerWidth !== lastWidth) {
                lastWidth = window.innerWidth;
                resize();
            }
        });

        resize();
        step();
    }


    // 1d. CURSOR AURA GLOW + SCROLL PROGRESS BAR
    const cursorAura = document.getElementById('cursor-aura');
    if (cursorAura && !('ontouchstart' in window)) {
        let auraX = window.innerWidth / 2, auraY = window.innerHeight / 2;
        let targetX = auraX, targetY = auraY;
        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            cursorAura.style.opacity = '1';
        }, { passive: true });
        const animateAura = () => {
            // Smooth easing toward the pointer for a trailing-glow feel
            auraX += (targetX - auraX) * 0.12;
            auraY += (targetY - auraY) * 0.12;
            cursorAura.style.transform = `translate3d(${auraX}px, ${auraY}px, 0)`;
            requestAnimationFrame(animateAura);
        };
        animateAura();
    }

    const scrollProgress = document.getElementById('scroll-progress');
    const siteNav = document.querySelector('.site-nav');
    let progressTicking = false;
    const updateProgress = () => {
        if (scrollProgress) {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight;
            const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
            scrollProgress.style.width = pct + '%';
        }
        // Solidify the header once the user leaves the very top
        if (siteNav) {
            siteNav.classList.toggle('nav-scrolled', window.scrollY > 24);
        }
        progressTicking = false;
    };
    window.addEventListener('scroll', () => {
        if (!progressTicking) {
            requestAnimationFrame(updateProgress);
            progressTicking = true;
        }
    }, { passive: true });
    updateProgress();


    // 1e. MOBILE NAVIGATION MENU TOGGLE
    const navToggle = document.getElementById('nav-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (navToggle && mobileMenu) {
        const setMenu = (open) => {
            mobileMenu.classList.toggle('menu-open', open);
            navToggle.classList.toggle('is-active', open);
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        navToggle.addEventListener('click', () => {
            setMenu(!mobileMenu.classList.contains('menu-open'));
        });
        // Close after picking a destination
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
        // Close when resizing up to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) setMenu(false);
        });
    }


    // 2. ACTIVE MOUSE COORDINATE SPOTLIGHT MATRICES
    const spotlightCards = document.querySelectorAll('.spotlight-card');
    spotlightCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });


    // 3. SPRING INTERPOLATED MAGNET COMPONENTS
    const magnetButtons = document.querySelectorAll('.magnet-btn');
    magnetButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left - (rect.width / 2)) * 0.4;
            const y = (e.clientY - rect.top - (rect.height / 2)) * 0.4;
            btn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate3d(0px, 0px, 0)';
        });
    });


    // 4. 3D DEPTHE CARDS SWAP TIMELINE
    const swapCards = document.querySelectorAll('.swap-card');
    const nextSwapBtn = document.getElementById('next-swap-btn');
    let isFirstActive = true;

    function processCardRotation() {
        isFirstActive = !isFirstActive;
        if (!isFirstActive) {
            // Slide active view array back, shift bottom to priority visibility
            swapCards[0].style.transform = 'translate3d(0, -20px, -50px) scale(0.92)';
            swapCards[0].style.opacity = '0';
            swapCards[0].style.zIndex = '10';
            
            swapCards[1].style.transform = 'translate3d(0, 0, 0) scale(1)';
            swapCards[1].style.opacity = '1';
            swapCards[1].style.zIndex = '30';
            swapCards[1].classList.remove('opacity-0');
        } else {
            swapCards[0].style.transform = 'translate3d(0, 0, 0) scale(1)';
            swapCards[0].style.opacity = '1';
            swapCards[0].style.zIndex = '30';
            
            swapCards[1].style.transform = 'translate3d(0, 20px, -50px) scale(0.95)';
            swapCards[1].style.opacity = '0';
            swapCards[1].style.zIndex = '10';
        }
    }
    if (nextSwapBtn && swapCards.length >= 2) {
        nextSwapBtn.addEventListener('click', processCardRotation);
        swapCards.forEach(card => card.addEventListener('click', processCardRotation));
    }


    // 5. GLIDE INTERACTIVE CAROUSEL (cycles the exploration bullet points)
    const track = document.getElementById('carousel-track');
    const nextCarouselBtn = document.getElementById('next-carousel-btn');
    const prevCarouselBtn = document.getElementById('prev-carousel-btn');
    const dots = document.querySelectorAll('.indicator-dot');
    if (track && (nextCarouselBtn || prevCarouselBtn)) {
        const slideCount = track.children.length;   // dynamic — adapts to slide count
        let activeSlideIndex = 0;

        const goToSlide = (index) => {
            activeSlideIndex = (index + slideCount) % slideCount;
            track.style.transform = `translate3d(-${activeSlideIndex * 100}%, 0, 0)`;
            dots.forEach((dot, i) => {
                if (i === activeSlideIndex) {
                    dot.classList.remove('bg-brandTertiary/20', 'w-1.5');
                    dot.classList.add('bg-brandPrimary', 'w-3');
                } else {
                    dot.classList.remove('bg-brandPrimary', 'w-3');
                    dot.classList.add('bg-brandTertiary/20', 'w-1.5');
                }
            });
        };

        if (nextCarouselBtn) {
            nextCarouselBtn.addEventListener('click', () => goToSlide(activeSlideIndex + 1));
        }
        if (prevCarouselBtn) {
            prevCarouselBtn.addEventListener('click', () => goToSlide(activeSlideIndex - 1));
        }
        // Allow jumping directly via the dot indicators
        dots.forEach((dot, i) => {
            dot.style.cursor = 'pointer';
            dot.addEventListener('click', () => goToSlide(i));
        });
    }


    // 6. ANIMATED LIST (staggered reveal of opportunity bullet points)
    const animatedLists = document.querySelectorAll('.animated-list');
    if (animatedLists.length) {
        const listObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    listObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        animatedLists.forEach(list => listObserver.observe(list));
    }

    // 7. INTERACTIVE FRAMEWORK SPLIT / ORBITAL DIAL LAYOUT
    const frameworkSteps = [
        {
            number: "01",
            title: "Discover",
            desc: "Researching users, behaviors, and opportunities to uncover core needs, pains, and market potentials.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
            tags: ["User Interviews", "Competitive Audit", "Field Studies", "Market Analysis"]
        },
        {
            number: "02",
            title: "Define",
            desc: "Synthesizing findings to identify key insights and define the core problem statements, user journey maps, and requirements.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`,
            tags: ["Problem Framing", "Persona Creation", "Journey Maps", "Information Architecture"]
        },
        {
            number: "03",
            title: "Design",
            desc: "Creating user flows, detailed wireframes, high-fidelity user interfaces, and robust, scalable design systems.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
            tags: ["User Flows", "UI Design System", "Interactive Prototypes", "Micro-Interactions"]
        },
        {
            number: "04",
            title: "Validate",
            desc: "Testing assumptions, running usability sessions, compiling feedback, and performing heuristic analysis to refine the product.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
            tags: ["Usability Testing", "Feedback Loops", "A/B Experiments", "Heuristic Analysis"]
        },
        {
            number: "05",
            title: "Refine",
            desc: "Preparing design handoffs, tracking product usage post-launch, and performing conversion rate optimizations for long-term value.",
            icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
            tags: ["Design Handoff", "Analytics Auditing", "CRO Iterations", "Feature Optimization"]
        }
    ];

    // Mobile Elements
    const detailCard = document.getElementById('framework-detail-card');
    const mobileTriggers = document.querySelectorAll('.fw-step-trigger');
    const numEl = document.getElementById('fw-detail-number');
    const iconEl = document.getElementById('fw-detail-icon');
    const titleEl = document.getElementById('fw-detail-title');
    const descEl = document.getElementById('fw-detail-desc');
    const tagsEl = document.getElementById('fw-detail-tags');

    // Desktop Elements
    const hubCard = document.getElementById('framework-hub');
    const orbitalNodes = document.querySelectorAll('.fw-orbital-node');
    const hubNumEl = document.getElementById('fw-hub-number');
    const hubTitleEl = document.getElementById('fw-hub-title');
    const hubDescEl = document.getElementById('fw-hub-desc');
    const hubTagEl = document.getElementById('fw-hub-tag');
    const glowPath = document.getElementById('orbital-glow-path');

    // Unified Update Function
    const updateFrameworkStep = (index) => {
        const step = frameworkSteps[index];
        if (!step) return;

        // 1. Update Mobile Layout
        if (detailCard && mobileTriggers.length) {
            mobileTriggers.forEach(t => t.classList.remove('active-step'));
            if (mobileTriggers[index]) {
                mobileTriggers[index].classList.add('active-step');
            }

            detailCard.style.opacity = '0.3';
            detailCard.style.transform = 'translateY(10px) scale(0.99)';

            setTimeout(() => {
                if (numEl) numEl.textContent = step.number;
                if (iconEl) iconEl.innerHTML = step.icon;
                if (titleEl) titleEl.textContent = step.title;
                if (descEl) descEl.textContent = step.desc;
                if (tagsEl) {
                    tagsEl.innerHTML = step.tags
                        .map(tag => `<span class="px-3.5 py-1.5 bg-[#12121A] border border-brandTertiary/10 rounded-full text-titleSecond font-sans text-xs tracking-wide">${tag}</span>`)
                        .join('');
                }
                detailCard.style.opacity = '1';
                detailCard.style.transform = 'translateY(0) scale(1)';
            }, 180);
        }

        // 2. Update Desktop Layout
        if (hubCard && orbitalNodes.length) {
            orbitalNodes.forEach(node => node.classList.remove('active-node'));
            if (orbitalNodes[index]) {
                orbitalNodes[index].classList.add('active-node');
            }

            // Animate SVG path dashoffset (circumference = 1256.6)
            if (glowPath) {
                // progressive connection clockwise: index 0 -> 100%, 1 -> 80%, 2 -> 60%, 3 -> 40%, 4 -> 20%
                const fraction = 1 - (index * 0.2);
                const offset = 1256.6 * fraction;
                glowPath.style.strokeDashoffset = offset.toFixed(1);
            }

            hubCard.style.opacity = '0.3';
            hubCard.style.transform = 'translate(-50%, -50%) scale(0.96)';

            setTimeout(() => {
                if (hubNumEl) hubNumEl.textContent = step.number;
                if (hubTitleEl) hubTitleEl.textContent = step.title;
                if (hubDescEl) hubDescEl.textContent = step.desc;
                if (hubTagEl) hubTagEl.textContent = step.tags[0]; // first focus area tag

                hubCard.style.opacity = '1';
                hubCard.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 180);
        }
    };

    // Attach listeners to Mobile Triggers
    if (mobileTriggers.length) {
        mobileTriggers.forEach((trigger, idx) => {
            trigger.addEventListener('mouseenter', () => updateFrameworkStep(idx));
            trigger.addEventListener('click', () => updateFrameworkStep(idx));
        });
    }

    // Attach listeners to Desktop Orbital Nodes
    if (orbitalNodes.length) {
        orbitalNodes.forEach((node, idx) => {
            node.addEventListener('mouseenter', () => updateFrameworkStep(idx));
            node.addEventListener('click', () => updateFrameworkStep(idx));
        });
    }

    // --- 9. INTERACTIVE 3D UI/UX MODEL TILT CONTROLLER ---
    const contactModelPanel = document.querySelector('.contact-model-panel');
    const designStack = document.getElementById('interactive-design-stack');

    if (contactModelPanel && designStack) {
        // Base Isometric Angle config (must match style.css)
        const baseRotateX = 54; 
        const baseRotateY = 0;
        const baseRotateZ = -45;

        // Smoothly tilt stack on mouse move
        contactModelPanel.addEventListener('mousemove', (e) => {
            const rect = contactModelPanel.getBoundingClientRect();
            
            // Get mouse position relative to center of panel (-0.5 to 0.5)
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            // Calculate dynamic rotation angles (max tilt +/- 18 degrees)
            const tiltX = baseRotateX - (y * 36); 
            const tiltY = baseRotateY + (x * 36); 
            
            // Apply 3D transform transition inline
            designStack.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${baseRotateZ}deg)`;
        });

        // Reset to base isometric view on mouse leave
        contactModelPanel.addEventListener('mouseleave', () => {
            designStack.style.transform = `rotateX(${baseRotateX}deg) rotateY(${baseRotateY}deg) rotateZ(${baseRotateZ}deg)`;
        });
    }
});

