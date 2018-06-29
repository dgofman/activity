<!DOCTYPE html>
<html lang="en">
<head>
    <title>${Locales.pageTitle}</title>
    <link rel="stylesheet" type="text/css" href="/css/login.css"/>
</head>

<body>
    <form method="post" action="/login">
        <div>
            <h1>${Locales.title}</h1>
            <span>${Locales.username}</span>
            <input id="username" name="username" type="text" tabindex="1" value="${username}" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.password}</span>
            <input id="password" name="password" type="password" tabindex="2" value="" autocorrect="off" autocapitalize="off", required>
            <h5>${error}</h5>
            <button>${Locales.login}</button>
            <a href="/login/new">${Locales.register}</a>
        </div>
    </form>
</body>
</html>