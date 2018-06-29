<!DOCTYPE html>
<html lang="en">
<head>
    <title>${Locales.pageTitle}</title>
    <link rel="stylesheet" type="text/css" href="/css/login.css"/>

    <script>
    function validatePassword() {
        var password = document.getElementById("password"),
            confirm_password = document.getElementById("confirm");
        if(password.value != confirm_password.value) {
            confirm_password.setCustomValidity("${Locales.password_match}");
        } else {
            confirm_password.setCustomValidity('');
        }
    }
    </script>
</head>

<body>
    <form method="post" action="/login/new">
        <div>
            <h1>${Locales.register}</h1>
            <span>${Locales.firstname}</span>
            <input id="firstname" name="firstname" type="text" tabindex="1" value="${body.firstname}" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.lastname}</span>
            <input id="lastname" name="lastname" type="text" tabindex="2" value="${body.lastname}" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.username}</span>
            <input id="username" name="username" type="text" tabindex="3" value="${body.username}" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.email}</span>
            <input id="email" name="email" type="email" tabindex="4" value="${body.email}" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.password}</span>
            <input id="password" name="password" type="password" tabindex="5" value="" autocorrect="off" autocapitalize="off" required>
            <span>${Locales.confirm_password}</span>
            <input id="confirm" type="password" tabindex="6" value="" autocorrect="off" autocapitalize="off" onkeydown="this.setCustomValidity('')" required>
            <h5>${error}</h5>
            <button onclick="validatePassword()">${Locales.submit}</button>
        </div>
    </form>
</body>
</html>