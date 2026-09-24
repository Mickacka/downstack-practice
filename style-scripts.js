function toggleBurger() {
    const dropdown = document.querySelector('.nav .dropdown');
    const open = dropdown.classList.toggle('open');
    const burger = document.querySelector('.burger');
    if (burger) burger.setAttribute('aria-expanded', open);
}

function toggleSettings() {
    const dropdown = document.querySelector('.nav .dropdown');
    const setting = document.getElementById('setting');
    dropdown.classList.remove('open');
    const burger = document.querySelector('.burger');
    if (burger) burger.setAttribute('aria-expanded', false);
    setting.classList.toggle('open');

}

function closeSettings() {
    const setting = document.getElementById('setting');
    setting.classList.remove('open');
}

function toggleOptions() {
    const gamemode = document.getElementById('gamemode');
    const game_button = document.getElementById('game_button');
    if (gamemode.classList.contains('open')) {
        game_button.innerHTML = 'Show Options';
    } else {
        game_button.innerHTML = 'Hide Options';
    }
    gamemode.classList.toggle('open');
}

// Touch controls: 'auto' shows them on touch devices (including iPads that
// report a desktop user agent), 'on'/'off' force them.
function is_touch_device() {
    const ua = navigator.userAgent;
    return window.matchMedia('(pointer: coarse)').matches ||
        navigator.maxTouchPoints > 1 ||
        /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Kindle|Silk|PlayBook|(hpw|web)OS|Opera M(obi|ini)/i.test(ua);
}

function get_touch_setting() {
    try {
        return localStorage.getItem('touch_controls') || 'auto';
    } catch (e) {
        return 'auto';
    }
}

function apply_touch_controls() {
    const tcc = document.getElementById('tcc');
    if (!tcc) return;
    const setting = get_touch_setting();
    const show = setting === 'on' || (setting === 'auto' && is_touch_device());
    tcc.classList.toggle('show', show);
    const board = document.getElementById('board');
    // Tapping the touch buttons would otherwise blur the board and show "OUT OF FOCUS"
    if (board && show) board.onblur = (e => e.preventDefault());
}

function setup_touch_controls() {
    const select = document.getElementById('touch_controls');
    if (select) {
        select.value = get_touch_setting();
        select.onchange = () => {
            try { localStorage.setItem('touch_controls', select.value); } catch (e) {}
            // restore the default focus handling when hiding the controls
            if (select.value !== 'on' && !is_touch_device()) location.reload();
            else apply_touch_controls();
        };
    }
    apply_touch_controls();
}


// Escape closes the settings panel and the menu
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const setting = document.getElementById('setting');
    const dropdown = document.querySelector('.nav .dropdown');
    if (setting) setting.classList.remove('open');
    if (dropdown && dropdown.classList.contains('open')) toggleBurger();
});
