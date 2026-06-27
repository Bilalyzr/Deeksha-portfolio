document.addEventListener("DOMContentLoaded", () => {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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


    // 1b. SCROLL-DRIVEN HERO BEAM LIGHT FIELD
    // Maps scroll position through the hero (0 -> 1) onto a CSS variable so the
    // light beams drift upward and fade as the section leaves the viewport.
    const heroSection = document.getElementById('hero');
    const beamField = document.querySelector('.hero-beam-field');
    if (heroSection && beamField) {
        let scrollTicking = false;
        const updateBeamProgress = () => {
            const heroHeight = heroSection.offsetHeight || window.innerHeight;
            const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
            beamField.style.setProperty('--scroll', progress.toFixed(3));
            scrollTicking = false;
        };
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                window.requestAnimationFrame(updateBeamProgress);
                scrollTicking = true;
            }
        }, { passive: true });
        updateBeamProgress();
    }


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
    const dots = document.querySelectorAll('.indicator-dot');
    if (track && nextCarouselBtn) {
        const slideCount = track.children.length;   // dynamic — adapts to slide count
        let activeSlideIndex = 0;

        const goToSlide = (index) => {
            activeSlideIndex = (index + slideCount) % slideCount;
            track.style.transform = `translate3d(-${activeSlideIndex * 100}%, 0, 0)`;
            dots.forEach((dot, i) => {
                if (i === activeSlideIndex) {
                    dot.classList.remove('bg-brandTertiary/20');
                    dot.classList.add('bg-brandPrimary', 'w-3');
                } else {
                    dot.classList.remove('bg-brandPrimary', 'w-3');
                    dot.classList.add('bg-brandTertiary/20');
                }
            });
        };

        nextCarouselBtn.addEventListener('click', () => goToSlide(activeSlideIndex + 1));
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
});
