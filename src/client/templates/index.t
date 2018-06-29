<!DOCTYPE html>
<html lang="en">
<head>
    <title>${Locales.pageTitle}</title>
    <script src="/vendor/requirejs/require.js" data-main="/scripts/Main"></script>
    <link rel="stylesheet" type="text/css" href="/css/main.css"/>
    <script>
        var Id = ${ID};
        var Data = ${DATA};
        var Tree = ${TREE};
    </script>
</head>

<body>
    <header>
        <span>${Locales.welcome}, ${FIRSTNAME}</span>
    </header>
    <section>
        <div id="sidePanel"></div>
        <div id="svgPanel">
            <svg width="100%" height="100%"></svg>
        </div>
    </section>
    <div class="modal confirm"></div>
    <div class="modal rename" width="400px" height="170px">
        <table>
            <tr>
                <td>${Locales.title}</td>
                <td><input id="title" text=""/></td>
            </tr>
        </table>
    </div>
    <div class="modal condition" width="400px" height="250px">
        <table>
            <tr>
                <td>${Locales.title}</td>
                <td><input id="title" text=""/></td>
            </tr>
            <tr>
                <td>${Locales.success}</td>
                <td><input id="success" text=""/></td>
            </tr>
            <tr>
                <td>${Locales.exception}</td>
                <td><input id="exception" text=""/></td>
            </tr>
        </table>
    </div>
    <div class="modal open" width="400px" height="150px">
        <select style="width: 100%"></select>
    </div>
    <div class="modal saveas" width="400px" height="250px">
        <table>
            <tr>
                <td>${Locales.name}</td>
                <td><input id="name" text=""/></td>
            </tr>
            <tr>
                <td>${Locales.path}</td>
                <td><input id="path" text=""/></td>
            </tr>
            <tr class="isDefault">
                <td></td>
                <td><div><input type="checkbox" id="isDefault"/>${Locales.setDefault}</div></td>
            </tr>
        </table>
        <div class="error"></div>
    </div>
</body>

</html>