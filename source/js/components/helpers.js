function getScrollbarWidth() {
    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'modal-scrollbar-measure';
    document.body.appendChild(scrollDiv);
    const scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
}

function searchToObject(search) {
    return search
        .substring(1)
        .split('&')
        .reduce((result, value) => {
            const parts = value.split('=');
            if (parts[0]) result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
            return result;
        }, {});
}

function updateURL(data) {
    if (window.history.replaceState) {
        let urlParamsString = '';

        Object.keys(data).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (urlParamsString !== '') {
                    urlParamsString += '&';
                }
                urlParamsString += `${key}=${encodeURIComponent(data[key])}`;
            }
        });

        const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        const newUrl = `${baseUrl}?${urlParamsString}`;
        window.history.replaceState(null, null, newUrl);
    } else {
        console.warn('History API не поддерживается');
    }
}

function getParameterByName(name, url = window.location.href) {
    const cleanName = name.replace(/[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${cleanName}(=([^&#]*)|&|#|$)`);
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function smoothScroll(target, offset = 0) {
    const $target = $(target);
    if ($target.length) {
        $('html, body').animate(
            {
                scrollTop: $target.offset().top + offset,
            },
            300,
        );
    }
}

export {
    getScrollbarWidth, searchToObject, updateURL, getParameterByName, smoothScroll,
};
