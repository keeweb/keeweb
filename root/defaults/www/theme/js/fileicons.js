/*
    @app            keeweb
    @author         Aetherinox
    @repo           https://github.com/keeweb/keeweb
                    https://github.com/keeweb/docker-alpine-base
                    https://hub.docker.com/repository/docker/keeweb/keeweb
                    https://hub.docker.com/repository/docker/keeweb/alpine-base

    Generate icons for each file shown in list
*/

function GenerateFileIcons()
{
    function e(e)
    {
        return '<i class="fa fa-fw ' + e + '" aria-hidden="true"></i>'
    }

    var a = document.getElementById("list");
    a.removeAttribute("cellpadding"), a.removeAttribute("cellspacing"), a.classList.add("table", "table-sm", "table-hover", "text-nowrap"), a.tHead.children[0].classList.add("d-none", "d-md-table-row"), "/" != window.location.pathname && a.deleteRow(1);

    for (var s, c = 0; s = a.rows[c]; c++) filetype = function(e)
    {
        if (e.endsWith("/"))
            return "fa-duotone fa-solid fa-folder";

        switch (e.split(".").pop().toLowerCase())
        {
            case "txt":
                return "fa-solid fa-file-lines";
            case "pdf":
                return "fa-solid fa-file-pdf";
            case "bmp":
                return "fa-solid fa-file-image";
            case "gif":
                return "fa-solid fa-file-gif";
            case "jpeg":
                return "fa-solid fa-file-jpg";
            case "jpg":
                return "fa-solid fa-file-jpg";
            case "png":
                return "fa-solid fa-file-png";
            case "tif":
                return "fa-solid fa-file-image";
            case "tiff":
                return "fa-solid fa-file-image";
            case "aac":
                return "fa-solid fa-file-music";
            case "aiff":
                return "fa-solid fa-file-audio";
            case "m4a":
                return "fa-solid fa-file-audio";
            case "mp3":
                return "fa-solid fa-file-mp3";
            case "ogg":
                return "fa-solid fa-file-music";
            case "opus":
                return "fa-solid fa-file-music";
            case "m3u":
                return "fa-solid fa-file-lines";
            case "m3u8":
                return "fa-solid fa-file-lines";
            case "wav":
                return "fa-solid fa-file-audio";
            case "amv":
                return "fa-solid fa-file-video";
            case "avi":
                return "fa-solid fa-file-video";
            case "flv":
                return "fa-solid fa-file-video";
            case "m4v":
                return "fa-solid fa-file-video";
            case "mkv":
                return "fa-solid fa-file-video";
            case "mov":
                return "fa-solid fa-file-mov";
            case "mp4":
                return "fa-solid fa-file-mp4";
            case "m4p":
                return "fa-solid fa-file-audio";
            case "mpeg":
                return "fa-solid fa-file-mp4"
            case "mpg":
                return "fa-solid fa-file-video";
            case "ogv":
                return "fa-solid fa-file-video";
            case "vob":
                return "fa-duotone fa-solid fa-photo-film";
            case "webm":
                return "fa-solid fa-file-video";
            case "wmv":
                return "fa-solid fa-file-video";
            case "7z":
                return "fa-solid fa-file-zipper";
            case "a":
                return "fa-solid fa-file-binary";
            case "apk":
                return "fa-solid fa-box-archive";
            case "ar":
                return "fa-solid fa-file-binary";
            case "bin":
                return "fa-solid fa-file-binary";
            case "bz2":
                return "fa-solid fa-file-zipper";
            case "cab":
                return "fa-solid fa-cabinet-filing";
            case "dmg":
                return "fa-solid fa-tablet-button";
            case "gz":
                return "fa-solid fa-file-zipper"
            case "xml":
                return "fa-solid fa-file-xml"
            case "iso":
                return "fa-duotone fa-regular fa-compact-disc";
            case "jar":
                return "fa-solid fa-jar";
            case "lz":
                return "fa-solid fa-file-zipper"
            case "lzma":
                return "fa-solid fa-file-zipper"
            case "lzo":
                return "fa-solid fa-file-zipper"
            case "pak":
                return "fa-solid fa-file-zipper"
            case "partimg":
                return "fa-solid fa-file-zipper"
            case "rar":
                return "fa-solid fa-file-zipper"
            case "s7z":
                return "fa-solid fa-file-zipper"
            case "tar":
                return "fa-solid fa-file-zipper"
            case "tbz2":
                return "fa-solid fa-file-zipper"
            case "tgz":
                return "fa-solid fa-file-zipper"
            case "tlz":
                return "fa-solid fa-file-zipper"
            case "txz":
                return "fa-solid fa-file-zipper"
            case "xz":
                return "fa-solid fa-file-zipper"
            case "zip":
                return "fa-solid fa-file-zip";
            case "doc":
                return "fa-solid fa-file-doc";
            case "docx":
                return "fa-solid fa-file-doc";
            case "odt":
                return "fa-solid fa-file-lines";
            case "rtf":
                return "fa-solid fa-file-word";
            case "csv":
                return "fa-solid fa-file-csv";
            case "ods":
                return "fa-solid fa-file-spreadsheet";
            case "xls":
                return "fa-solid fa-file-xls";
            case "xlsx":
                return "fa-solid fa-file-xls";
            case "odp":
                return "fa-solid fa-file-powerpoint";
            case "ppt":
                return "fa-solid fa-file-ppt";
            case "pptx":
                return "fa-solid fa-file-powerpoint";
            case "c":
                return "fa-solid fa-file-binary";
            case "class":
                return "fa-solid fa-file-binary";
            case "cpp":
                return "fa-solid fa-file-binary";
            case "cs":
                return "fa-solid fa-file-binary";
            case "h":
                return "fa-solid fa-file-binary";
            case "hpp":
                return "fa-solid fa-file-binary";
            case "hxx":
                return "fa-solid fa-file-binary";
            case "java":
                return "fa-solid fa-file-binary";
            case "py":
                return "fa-solid fa-file-code";
            case "sh":
                return "fa-solid fa-file-code";
            case "swift":
                return "fa-solid fa-file-code";
            case "vb":
                return "fa-solid fa-file-code";
            case "svg":
                return "fa-solid fa-file-svg";
            case "pem":
                return "fa-solid fa-file-lock";
            case "key":
                return "fa-solid fa-file-lock";
            case "eps":
                return "fa-solid fa-file-eps";
            case "cad":
                return "fa-solid fa-file-cad";
            default:
                return "fa-solid fa-file"
        }
    }(s.cells[0].children[0].innerHTML), s.insertCell(0).innerHTML = 0 < c ? e(filetype) : "", s.cells[0].classList.add("col-auto"), s.cells[1].classList.add("col", "filename"), s.cells[2].classList.add("col-auto", "d-none", "d-md-table-cell"), s.cells[3].classList.add("col-auto", "d-none", "d-md-table-cell"), "image" == filetype && s.cells[1].children[0].setAttribute("data-lightbox", "roadtrip")
}