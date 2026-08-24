document.addEventListener('DOMContentLoaded', function () {
    var prefersReducedMotionCarousel = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var popup = document.getElementById('welcome-popup');
    if (popup) {
        var WELCOME_POPUP_KEY = 'gsc_welcome_popup_shown';
        if (!localStorage.getItem(WELCOME_POPUP_KEY)) {
            window.addEventListener('load', function () {
                popup.style.display = 'flex';
                localStorage.setItem(WELCOME_POPUP_KEY, '1');
            });
        }

        var closeBtn = popup.querySelector('.popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                popup.style.display = 'none';
            });
        }

        popup.addEventListener('click', function (e) {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });

        var popupForm = document.getElementById('popupForm');
        if (popupForm) {
            popupForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var input = document.getElementById('popupNumber');
                var msg = document.getElementById('popupResponseMsg');
                submitPhone(input.value, msg, function () {
                    setTimeout(function () {
                        popup.style.display = 'none';
                    }, 1800);
                });
            });
        }
    }

    var subscribeForm = document.getElementById('subscribeForm');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var input = document.getElementById('subscribePhone');
            var msg = document.getElementById('subscribeMsg');
            submitPhone(input.value, msg);
        });
    }

    function submitPhone(number, msgEl, onSuccess) {
        if (!/^[0-9]{10}$/.test(number)) {
            msgEl.textContent = 'Please enter a valid 10-digit mobile number.';
            msgEl.style.color = '#d92d20';
            return;
        }

        msgEl.textContent = 'Submitting...';
        msgEl.style.color = '#5b6778';

        fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: number, source: window.location.pathname })
        })
            .then(function (r) {
                if (!r.ok) throw new Error('Request failed');
                return r.json();
            })
            .then(function () {
                msgEl.textContent = "Thank you! We'll be in touch soon.";
                msgEl.style.color = '#1a7f37';
                if (onSuccess) onSuccess();
            })
            .catch(function () {
                msgEl.textContent = 'Something went wrong. Please call us instead.';
                msgEl.style.color = '#d92d20';
            });
    }

    var enquiryForm = document.getElementById('enquiryForm');
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('enqName').value.trim();
            var contact = document.getElementById('enqContact').value.trim();
            var category = document.getElementById('enqCategory').value;
            var message = document.getElementById('enqMessage').value.trim();
            var msg = document.getElementById('enqMsg');
            var submitBtn = enquiryForm.querySelector('button[type="submit"]');

            if (!name || !contact || !message) {
                msg.textContent = 'Please fill in your name, contact detail, and enquiry.';
                msg.style.color = '#d92d20';
                return;
            }

            submitBtn.disabled = true;
            msg.textContent = 'Sending your enquiry...';
            msg.style.color = '#5b6778';

            fetch('/api/enquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, contact: contact, category: category, message: message })
            })
                .then(function (r) {
                    if (!r.ok) throw new Error('Request failed');
                    return r.json();
                })
                .then(function () {
                    msg.textContent = "Thank you! Your enquiry has been sent — we'll be in touch soon.";
                    msg.style.color = '#1a7f37';
                    enquiryForm.reset();
                })
                .catch(function () {
                    msg.textContent = 'Something went wrong. Please call us at 9891235107 instead.';
                    msg.style.color = '#d92d20';
                })
                .finally(function () {
                    submitBtn.disabled = false;
                });
        });
    }

    /* Mobile nav dropdown: tap to expand "Products" instead of requiring hover */
    document.querySelectorAll('nav ul li.has-dropdown > a').forEach(function (link) {
        link.addEventListener('click', function (e) {
            if (window.innerWidth <= 767) {
                e.preventDefault();
                link.parentElement.classList.toggle('open');
            }
        });
    });

    /* Trust-badge ticker (product + enquiry pages) */
    var TRUST_MARQUEE_ITEMS = [
        'Trusted Since 1997',
        'AISI 304 Grade Steel',
        'EN 124 Load-Rated Covers',
        'IS 12701 Material Norms',
        '10-Year Warranty on Sinks',
        'Pan-India Delivery',
        'Custom Fabrication Available',
        '500+ Institutional Clients'
    ];

    function buildMarquee(containerId, itemsHtml) {
        var el = document.getElementById(containerId);
        if (!el || !itemsHtml) return;
        var track = document.createElement('div');
        track.className = 'marquee-track';
        track.innerHTML = itemsHtml + itemsHtml;
        el.appendChild(track);
    }

    buildMarquee('trust-marquee', TRUST_MARQUEE_ITEMS.map(function (t) {
        return '<span class="marquee-badge"><span class="dot"></span>' + t + '</span>';
    }).join(''));

    /* Endless-scrolling product grid: duplicate the cards once so the
       track can loop seamlessly from translateX(-50%) back to 0% */
    var hubGrid = document.getElementById('hub-grid');
    var hubViewport = hubGrid && hubGrid.closest('.marquee-wrap.hub');
    if (hubGrid && hubViewport) {
        /* Duplicate the set so scrollLeft can wrap at the halfway point
           without the visitor ever seeing the seam. */
        Array.prototype.slice.call(hubGrid.children).forEach(function (card) {
            hubGrid.appendChild(card.cloneNode(true));
        });

        var HUB_PX_PER_SEC = 58;       /* time-based, so speed is identical
                                          on 60Hz and 120Hz displays */
        var hubPaused = false;
        var hubIdle = null;
        var dragging = false;
        var dragStartX = 0;
        var dragStartScroll = 0;
        var moved = false;

        function hubHalf() {
            return hubGrid.scrollWidth / 2;
        }

        function hubHold(ms) {
            hubPaused = true;
            clearTimeout(hubIdle);
            hubIdle = setTimeout(function () { hubPaused = false; }, ms || 2500);
        }

        /* scrollLeft reads back rounded to whole pixels in most engines, so
           `scrollLeft += 0.95` would discard the fraction every frame and the
           strip would barely creep. Track the position as a float ourselves
           and assign it absolutely instead. */
        var hubPos = hubViewport.scrollLeft;
        var hubLast = performance.now();

        function hubTick(now) {
            var half = hubHalf();
            /* Clamped delta-time: keeps the speed constant across refresh
               rates, and stops the strip lurching after the tab was
               backgrounded (where frames can be seconds apart). */
            var dt = Math.min((now - hubLast) / 1000, 0.1);
            hubLast = now;

            if (!hubPaused && !dragging && !prefersReducedMotionCarousel && half > 0) {
                hubPos += HUB_PX_PER_SEC * dt;
                if (hubPos >= half) hubPos -= half;
                hubViewport.scrollLeft = hubPos;
            } else if (half > 0) {
                /* Manual scroll/drag owns the position — re-sync and wrap it */
                hubPos = hubViewport.scrollLeft;
                if (hubPos >= half) {
                    hubPos -= half;
                    hubViewport.scrollLeft = hubPos;
                } else if (hubPos <= 0) {
                    hubPos += half;
                    hubViewport.scrollLeft = hubPos;
                }
            }

            requestAnimationFrame(hubTick);
        }

        /* Hover pauses on desktop; wheel/touch briefly hand over control */
        hubViewport.addEventListener('mouseenter', function () {
            hubPaused = true;
            clearTimeout(hubIdle);
        });
        hubViewport.addEventListener('mouseleave', function () { hubHold(600); });
        hubViewport.addEventListener('wheel', function () { hubHold(); }, { passive: true });
        hubViewport.addEventListener('touchstart', function () { hubHold(); }, { passive: true });
        hubViewport.addEventListener('touchend', function () { hubHold(); }, { passive: true });

        /* Click-and-drag to scrub the strip by hand */
        hubViewport.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging = true;
            moved = false;
            dragStartX = e.clientX;
            dragStartScroll = hubViewport.scrollLeft;
            hubViewport.setPointerCapture(e.pointerId);
        });

        hubViewport.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var dx = e.clientX - dragStartX;
            if (Math.abs(dx) > 3) moved = true;
            hubViewport.scrollLeft = dragStartScroll - dx;
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            if (e.pointerId !== undefined && hubViewport.hasPointerCapture &&
                hubViewport.hasPointerCapture(e.pointerId)) {
                hubViewport.releasePointerCapture(e.pointerId);
            }
            hubHold();
        }
        hubViewport.addEventListener('pointerup', endDrag);
        hubViewport.addEventListener('pointercancel', endDrag);

        /* Suppress the click that follows an actual drag, so dragging the
           strip never navigates to a product page by accident */
        hubViewport.addEventListener('click', function (e) {
            if (moved) {
                e.preventDefault();
                e.stopPropagation();
                moved = false;
            }
        }, true);

        /* Native image dragging would hijack the pointer mid-scrub */
        hubViewport.querySelectorAll('img').forEach(function (img) {
            img.setAttribute('draggable', 'false');
        });

        requestAnimationFrame(hubTick);
    }

    /* Scroll-reveal for cards and content blocks already on the page
       (hub-card is excluded — it now lives in the endless marquee above) */
    var revealTargets = document.querySelectorAll(
        '.feature-card, .testimonial-card, .stat-item, .related-card, ' +
        '.standard-chip, .layer-chip, .faq-item, .cta-banner, .subscribe-strip, ' +
        '.product-detail-container, .spec-table-wrap, .admin-card, .diagram-frame, ' +
        '.fitting-card, .range-tile'
    );

    if (revealTargets.length) {
        revealTargets.forEach(function (el, i) {
            el.classList.add('reveal', 'reveal-delay-' + ((i % 3) + 1));
        });

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

            /* .feature-card / .testimonial-card can sit inside a mobile
               horizontal-scroll carousel, where cards off to the side never
               intersect the viewport and would stay hidden forever. Reveal
               those as a group when their grid container comes into view
               instead of watching each card individually. */
            revealTargets.forEach(function (el) {
                var carouselParent = el.closest('.feature-grid, .testimonial-grid');
                if (!carouselParent) {
                    io.observe(el);
                }
            });

            var groupContainers = document.querySelectorAll('.feature-grid, .testimonial-grid');
            if (groupContainers.length) {
                var groupIo = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.querySelectorAll('.reveal').forEach(function (el) {
                                el.classList.add('is-visible');
                            });
                            groupIo.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

                groupContainers.forEach(function (el) {
                    groupIo.observe(el);
                });
            }
        } else {
            revealTargets.forEach(function (el) {
                el.classList.add('is-visible');
            });
        }
    }

    /* Animated stat counters — parses existing "25+", "10,000+" style text */
    var statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length && 'IntersectionObserver' in window) {
        var statIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                animateCount(entry.target);
                statIo.unobserve(entry.target);
            });
        }, { threshold: 0.4 });

        statNumbers.forEach(function (el) {
            statIo.observe(el);
        });
    }

    function animateCount(el) {
        var raw = el.textContent.trim();
        var match = raw.match(/^([\d,]+)(.*)$/);
        if (!match) return;

        var target = parseInt(match[1].replace(/,/g, ''), 10);
        var suffix = match[2] || '';
        if (isNaN(target)) return;

        var duration = 1400;
        var start = null;

        function step(timestamp) {
            if (start === null) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(target * eased);
            el.textContent = current.toLocaleString('en-IN') + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = target.toLocaleString('en-IN') + suffix;
            }
        }

        window.requestAnimationFrame(step);
    }

    /* Back-to-top button */
    var backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    backToTop.innerHTML = '&uarr;';
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', function () {
        if (window.scrollY > 500) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* Mobile swipe affordance: card rows turn into horizontal carousels under
       768px. Without a cue people scroll straight past them, so each row gets
       a "swipe" label plus a single nudge animation the first time it appears. */
    var swipeRows = document.querySelectorAll(
        '.feature-grid, .testimonial-grid, .fitting-grid, .range-tile-grid, .related-grid, .standards-grid'
    );

    if (swipeRows.length) {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var addCue = function (row) {
            if (row.previousElementSibling && row.previousElementSibling.classList.contains('swipe-cue')) return;
            var cue = document.createElement('div');
            cue.className = 'swipe-cue';
            cue.setAttribute('aria-hidden', 'true');
            cue.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>' +
                '</svg> Swipe for more';
            row.parentNode.insertBefore(cue, row);
        };

        var nudge = function (row) {
            if (reduceMotion || row.dataset.nudged) return;
            /* Only nudge when the row is actually scrollable sideways */
            if (row.scrollWidth <= row.clientWidth + 8) return;
            row.dataset.nudged = '1';
            row.classList.add('swipe-hint');
            window.setTimeout(function () {
                row.classList.add('nudge');
                window.setTimeout(function () {
                    row.classList.remove('nudge');
                }, 480);
            }, 260);
        };

        var isMobile = function () {
            return window.matchMedia('(max-width: 767px)').matches;
        };

        var syncCues = function () {
            swipeRows.forEach(function (row) {
                if (isMobile() && row.scrollWidth > row.clientWidth + 8) {
                    addCue(row);
                } else if (row.previousElementSibling &&
                           row.previousElementSibling.classList.contains('swipe-cue')) {
                    row.previousElementSibling.remove();
                }
            });
        };

        syncCues();
        window.addEventListener('resize', syncCues);

        if ('IntersectionObserver' in window) {
            var swipeIo = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting || !isMobile()) return;
                    nudge(entry.target);
                    swipeIo.unobserve(entry.target);
                });
            }, { threshold: 0.35 });

            swipeRows.forEach(function (row) {
                swipeIo.observe(row);
            });
        }

        /* Once the visitor actually swipes, the cue has done its job */
        swipeRows.forEach(function (row) {
            row.addEventListener('scroll', function () {
                if (row.scrollLeft > 12 && row.previousElementSibling &&
                    row.previousElementSibling.classList.contains('swipe-cue')) {
                    row.previousElementSibling.style.opacity = '0';
                }
            }, { passive: true });
        });
    }


    /* ---------------- Auto-advancing carousels ----------------
       Rows scroll themselves, but never fight the visitor: any manual
       interaction (touch, drag, wheel, keyboard, hover) pauses the timer and
       it only resumes once they have been idle again. Rows that already fit
       on screen are marked .is-static and centred instead of scrolled. */
    var carousels = document.querySelectorAll(
        '.feature-grid, .testimonial-grid, .fitting-grid, ' +
        '.range-tile-grid, .related-grid, .standards-grid'
    );

    carousels.forEach(function (el) {
        var timer = null;
        var idleTimer = null;
        var paused = false;
        var inView = false;

        function overflows() {
            return el.scrollWidth - el.clientWidth > 8;
        }

        function syncStatic() {
            el.classList.toggle('is-static', !overflows());
        }

        function advance() {
            if (paused || !inView || !overflows()) return;
            var first = el.firstElementChild;
            if (!first) return;
            var gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 0;
            var stride = first.getBoundingClientRect().width + gap;
            var atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
            el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + stride, behavior: 'smooth' });
        }

        function start() {
            clearInterval(timer);
            timer = setInterval(advance, 4200);
        }

        /* Hold while the visitor is interacting, then hand control back */
        function hold(ms) {
            paused = true;
            clearTimeout(idleTimer);
            idleTimer = setTimeout(function () { paused = false; }, ms || 7000);
        }

        ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (evt) {
            el.addEventListener(evt, function () { hold(); }, { passive: true });
        });
        el.addEventListener('mouseenter', function () { paused = true; clearTimeout(idleTimer); });
        el.addEventListener('mouseleave', function () { hold(1200); });
        el.addEventListener('focusin', function () { paused = true; clearTimeout(idleTimer); });
        /* Without this, tabbing into a card and back out would leave the
           row paused permanently. */
        el.addEventListener('focusout', function () { hold(1200); });

        window.addEventListener('resize', syncStatic);
        syncStatic();

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { inView = e.isIntersecting; });
            }, { threshold: 0.25 }).observe(el);
        } else {
            inView = true;
        }

        if (!prefersReducedMotionCarousel) start();
    });

    /* Continuously toggle between the two images until the visitor hovers */
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
        document.querySelectorAll('.image-hover.image-large.auto-toggle').forEach(function (el) {
            var timer = null;

            function start() {
                clearInterval(timer);
                timer = setInterval(function () {
                    el.classList.toggle('auto-toggle-active');
                }, 2200);
            }

            function stop() {
                clearInterval(timer);
                el.classList.remove('auto-toggle-active');
            }

            start();
            el.addEventListener('mouseenter', stop);
            el.addEventListener('mouseleave', start);
        });
    }
});
