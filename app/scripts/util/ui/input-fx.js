const InputFx = {
    shake(el) {
        el.addClass('input-shake');
        setTimeout(() => el.removeClass('input-shake'), 1000);
    }
};

export { InputFx };
