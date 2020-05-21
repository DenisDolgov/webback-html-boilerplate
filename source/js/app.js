/* global NODE_ENV DEBUG */
import $breakpoints from '~/components/breakpoints';

import {
    updateURL, searchToObject, getParameterByName, smoothScroll,
} from '~/components/helpers';
import Stickyfill from 'stickyfilljs';

import('~/components/network-information');
// import('~/components/sentry');
import('~/components/bootstrap');
import('~/components/svg-srite');

import('owl.carousel');
import('@fancyapps/fancybox');
import('jquery-tagcanvas/jquery.tagcanvas.js');

import('~/components/type-filter');
import('~/components/sort-filter');
import('~/components/show-more');
import('~/components/menu-toggle');

jQuery(($) => {
    console.log(`NODE_ENV=${NODE_ENV}; DEBUG=${DEBUG}; jQuery=${$.fn.jquery};`);

    const $html = $(document.documentElement);
    $html.addClass('ready-js');

    const $body = $('body');
    const $header = $('.header');
    const arrowLeftTpl = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16">
            <path fill="#FFF" d="M10 0L4 8l6 8H6L0 8l6-8z"/>
        </svg>`;
    const arrowRightTpl = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16">
            <path fill="#FFF" d="M0 0l6 8-6 8h4l6-8-6-8z"/>
        </svg>`;

    // sticky polyfill
    const $stickyElements = $('.js-sticky');
    Stickyfill.add($stickyElements);

    // check "tag" parameter
    if (getParameterByName('tags')) {
        if ($('#tag-result').length) {
            smoothScroll('#tag-result', -$header.innerHeight());
        } else {
            smoothScroll('#news-filter-group', -$header.innerHeight());
        }
    }

    // tag canvas
    let tagCanvasIsInit = false;
    const $tagCanvas = $('#tag-canvas');
    const activeTagText = $('.header-tags__list .active').text();
    window.$tagCanvas = $tagCanvas;
    const tagCanvasConfig = {
        textColour: null,
        textFont: 'Circe',
        outlineColour: '#ed554a',
        reverse: true,
        depth: 0.8,
        maxSpeed: 0.05,
        outlineMethod: 'colour',
    };

    function tagCanvasInit() {
        $tagCanvas.removeAttr('width').removeAttr('height');
        const w = $tagCanvas.innerWidth();
        const h = $tagCanvas.innerHeight();
        $tagCanvas.attr('width', w).attr('height', h);

        let config;
        if (window.matchMedia(`(min-width:${$breakpoints.lg})`).matches) {
            config = {
                ...tagCanvasConfig,
                stretchX: 1.5,
                textHeight: 25,
                wheelZoom: false,
            };
        } else {
            config = {
                ...tagCanvasConfig,
                dragControl: true,
                textHeight: h / 19,
                depth: 0.1,
            };
        }

        try {
            $tagCanvas.tagcanvas(config, 'tags');
            tagCanvasIsInit = true;
            $('.header-tags__list').hide();
        } catch (e) {
            console.log('Элемент canvas не поддерживается вашим браузером!');
        }
    }

    tagCanvasInit();
    $(window).on('resize load', tagCanvasInit);

    // header menu toggle
    $('.header-toggle')
        .menuToggle({ overlay: '.header-menu__overlay' })
        .on('open', () => {
            if (tagCanvasIsInit) {
                $tagCanvas.tagcanvas('resume');
                if (activeTagText) {
                    $tagCanvas.tagcanvas('tagtofront', { text: activeTagText });
                }
            }
        })
        .on('close', () => {
            if (tagCanvasIsInit) {
                $tagCanvas.tagcanvas('pause');
            }
        });

    // header search
    const $headerSearch = $('.header-search');
    $headerSearch.on('focus', '.header-search__input', () => $body.addClass('search-focus'));
    $headerSearch.on('blur', '.header-search__input', (e) => {
        if ($(e.relatedTarget).hasClass('header-search__submit')) {
            return;
        }
        $body.removeClass('search-focus');
    });

    // sticky header
    function checkStickyHeader() {
        if ($(window).scrollTop() >= $header.offset().top && $(window).scrollTop() > 100) {
            $body.addClass('sticky-header');
        } else {
            $body.removeClass('sticky-header');
        }
    }
    $(window).on('scroll', checkStickyHeader);
    checkStickyHeader();

    // main slider
    const $mailSlider = $('.main-slider');
    let currentColorClass = null;
    $mailSlider
        .on('changed.owl.carousel initialized.owl.carousel', (e) => {
            if (!e.namespace) {
                return;
            }

            const $currentSlide = $mailSlider.find('.owl-item').eq(e.item.index);
            const color = $currentSlide.find('[data-color]').data('color');

            if (color) {
                if (color.indexOf('#') !== -1 || color.indexOf('rgb') !== -1) {
                    $mailSlider.removeClass(currentColorClass);
                    $mailSlider.css('color', color);
                } else {
                    $mailSlider.removeAttr('style');
                    currentColorClass = `dots-${color}`;
                    $mailSlider.addClass(currentColorClass);
                }
            } else {
                $mailSlider.removeClass(currentColorClass);
                $mailSlider.removeAttr('style');
            }
        })
        .owlCarousel({
            items: 1,
            autoHeight: true,
            responsive: {
                1025: {
                    nav: true,
                    navText: [arrowLeftTpl, arrowRightTpl],
                },
            },
        });

    function slidersInit() {
        // recommend slider
        $(document)
            .find('.recommend-slider:not(.owl-loaded)')
            .owlCarousel({
                autoWidth: true,
                dots: false,
                responsive: {
                    576: {
                        autoWidth: false,
                        items: 2,
                    },
                    1025: {
                        autoWidth: false,
                        items: 3,
                        nav: true,
                        navText: [arrowLeftTpl, arrowRightTpl],
                    },
                    1350: {
                        autoWidth: false,
                        items: 4,
                        nav: true,
                        navText: [arrowLeftTpl, arrowRightTpl],
                    },
                },
            });

        // default slider
        $(document)
            .find('.default-slider:not(.owl-loaded)')
            .each((i, el) => {
                const $slider = $(el);
                const $count = $slider.parent().find('.default-slider-count');

                $slider
                    .on('changed.owl.carousel initialized.owl.carousel', (e) => {
                        if (!e.namespace) {
                            return;
                        }
                        $count.text(`${e.item.index + 1} / ${e.item.count}`);
                    })
                    .owlCarousel({
                        items: 1,
                        dots: false,
                        margin: 10,
                        responsive: {
                            1025: {
                                margin: 0,
                                nav: true,
                                navText: [arrowLeftTpl, arrowRightTpl],
                            },
                        },
                    });
            });
    }
    slidersInit();

    // news show more
    const newsShowMoreConfig = {
        target: '#post-list',
        type: 'scroll',
        offset: 150,
        scrollIndicator: true,
    };
    $('#news-loader').showMore(newsShowMoreConfig);

    // news filter group
    const $filterGroup = $('#news-filter-group');
    const $sortFilter = $('#sort-filter');
    const $typeFilter = $('#type-filter');
    const $postSection = $('#post-section');
    let filterData = {};
    let sortData = {};

    function getNewsByFilter() {
        $filterGroup.addClass('loading');
        $('#news-loader').showMore('destroy');
        const data = {
            ...sortData,
            ...filterData,
        };

        const currentData = searchToObject(window.location.search);
        Object.assign(currentData, data);

        updateURL(currentData);
        $.get('/ajax/article.php', currentData)
            .done((res) => {
                $postSection.html(res);
                $('#news-loader').showMore(newsShowMoreConfig);
                $filterGroup.removeClass('loading');
            })
            .fail(() => {
                $filterGroup.removeClass('loading');
            });
    }

    // sticky filter
    if ($filterGroup.length) {
        let lastScrollTop = 0;
        $(window).on('scroll', () => {
            const scrollTop = $(window).scrollTop();

            if ($(window).scrollTop() + $header.innerHeight() >= $filterGroup.offset().top) {
                $body.addClass('sticky-filter');
            } else {
                $body.removeClass('sticky-filter');
            }
            if (scrollTop < lastScrollTop) {
                $body.addClass('scroll-top');
            } else {
                $body.removeClass('scroll-top');
            }
            lastScrollTop = scrollTop;
        });
    }

    // sort filter
    $sortFilter.sortFilter().on('filter.change', (e, data) => {
        sortData = data;
        getNewsByFilter();
    });

    // type filter
    $typeFilter.typeFilter().on('filter.change', (e, data) => {
        filterData = data;
        getNewsByFilter();
    });

    // fancybox
    $('[data-fancybox]').fancybox({
        btnTpl: {
            arrowRight:
                `<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">
                    <div>${arrowRightTpl}</div>
                </button>`,
            arrowLeft:
                `<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">
                    <div>${arrowLeftTpl}</div>
                </button>`,
        },
        buttons: ['slideShow', 'thumbs', 'close'],
        lang: 'ru',
        i18n: {
            ru: {
                CLOSE: 'Закрыть',
                NEXT: 'Вперед',
                PREV: 'Назад',
                ERROR: 'Не удалось загрузить медиаресурс. Пожалуйста, попробуйте позже',
                PLAY_START: 'Запустить слайдшоу',
                PLAY_STOP: 'Остановить слайдшоу',
                FULL_SCREEN: 'На весь экран',
                THUMBS: 'Миниатюры',
                DOWNLOAD: 'Скачать',
                SHARE: 'Поделиться',
                ZOOM: 'Увеличить',
            },
        },
        beforeShow(instance) {
            $(instance.$refs.caption).addClass('hide');
        },
        afterShow(instance, slide) {
            const contentH = $(slide.$slide).find('.fancybox-content').innerHeight();
            const h = instance.$refs.stage.innerHeight();
            const targetH = (h - contentH) / 2;
            console.log('targetH', targetH);
            $(instance.$refs.caption).find('.fancybox-caption__body').css('height', `${targetH}px`);
            $(instance.$refs.caption).removeClass('hide');
        },
    });

    // share block
    function getShareFixedOffset() {
        if (window.matchMedia(`(min-width:${$breakpoints.xl})`).matches) {
            return 40;
        }
        return 20;
    }
    function shareInit() {
        $('.share-block:not(.init)').each((i, el) => {
            const $el = $(el);
            $el.on('click', '[data-toggle="share"]', (e) => {
                e.preventDefault();
                $el.toggleClass('close');
            });
            $el.addClass('init');

            // sticky share
            const $container = $el.closest('.content');
            $(window).on('scroll', () => {
                const scrollTop = $(window).scrollTop();
                const topLimit = $container.offset().top - scrollTop - window.innerHeight;
                const bottomLimit = $container.innerHeight() + $container.offset().top - scrollTop - window.innerHeight;

                if (topLimit <= -200 && bottomLimit >= parseInt($el.css('bottom'), 10) - getShareFixedOffset()) {
                    $el.addClass('fixed');
                } else {
                    $el.removeClass('fixed');
                }
            });
        });
    }
    shareInit();

    // infinite scroll
    let nextURL;

    function updateNextURL(doc) {
        nextURL = $(doc)
            .find('[data-next-page]')
            .attr('href');
        console.log('nextURL', nextURL);
    }

    updateNextURL(document);

    if ($('.post-container').length) {
        // eslint-disable-next-line no-undef
        const infScroll = new InfiniteScroll('.post-container', {
            path: () => nextURL,
            append: '.post',
            history: 'push',
            historyTitle: true,
            debug: true,
        });
        infScroll.on('load', (doc) => {
            updateNextURL(doc);
            // $('.recommend-section').remove();
        });
        infScroll.on('append', (doc) => {
            slidersInit(doc);
            shareInit();
        });
    }
});
