var colorAxis = {
    min: 0,
    max: 1,
    stops: [
        [0, '#aa0000'],
        [0.5, '#eeee00'],
        [1, '#00aa00']
    ]
};

// See: http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// See: http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeBlend(p,c0,c1) {
    var n=p<0?p*-1:p,u=Math.round,w=parseInt;
    if(c0.length>7){
        var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
        return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
    }else{
        var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
        return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
    }
}

function normalize(value, min, max) {
    var range = max - min;
    return (range > 0 ? (value / range) : 0);
}

function interpolate(value, start, end) {
    return start + (end-start)*value;
}

function valueToHexColor(value) {
    var clampedValue = Math.max(colorAxis.min, Math.min(colorAxis.max, value));
    var normalizedValue = normalize(Number(clampedValue), colorAxis.min, colorAxis.max);

    var segment = 0;
    for (var i = 0; i < colorAxis.stops.length - 1; ++i) {
        segment = i;
        if (normalizedValue >= colorAxis.stops[i][0] && normalizedValue <= colorAxis.stops[i+1][0]) {
            break;
        }
    }

    var normalizedSegment = normalize(
        normalizedValue-colorAxis.stops[segment][0], 
        colorAxis.stops[segment][0], 
        colorAxis.stops[segment+1][0]);

    var minStopRgb = hexToRgb(colorAxis.stops[segment][1]);
    var maxStopRgb = hexToRgb(colorAxis.stops[segment+1][1]);

    var r = interpolate(normalizedSegment, minStopRgb.r, maxStopRgb.r);
    var g = interpolate(normalizedSegment, minStopRgb.g, maxStopRgb.g);
    var b = interpolate(normalizedSegment, minStopRgb.b, maxStopRgb.b);

    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

window.onload = function() {

    $(".scoreBox").each(function(index) {
        $(this).css({
            "border-left-color": valueToHexColor($(this).text()), 
            "background-color": shadeBlend(0.90, valueToHexColor($(this).text()))
        });
    });

    $(".scoreBackground").each(function(index) {
        $(this).css({
            "background-color": shadeBlend(0.90, valueToHexColor($(this).text()))
        });
    });
}