/*
    @app            keeweb
    @author         Aetherinox
    @repo           https://github.com/keeweb/keeweb
                    https://github.com/keeweb/alpine-base
                    https://hub.docker.com/repository/docker/keeweb/keeweb
                    https://hub.docker.com/repository/docker/keeweb/alpine-base

    Generate breadcrumbs for header
*/

function CreateBreadcrumbs(){for(var e,a,n,r=window.location.pathname.replace(/\/$/,"").split("/"),t="",c="",o=0;o<r.length;o++)c+=r[o]+"/",t+=(e=0==o?"Home":decodeURIComponent(r[o]),a=c,'<li class="breadcrumb-item'+((n=o==r.length-1)?' active aria-current="page':"")+'">'+(n?"":'<a href="'+a+'">')+e+(n?"":"</a>"));document.getElementById("breadcrumbs").innerHTML=t}
