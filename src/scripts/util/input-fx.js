const InputFx = {
    shake: function(el) {
        el.addClass('input-shake');
        setTimeout(() => el.removeClass('input-shake'), 1000);
    }
};

export default InputFx;
