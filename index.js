import QueryString from 'query-string';
import React, { useRef } from "react";
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeModules } from 'react-native';

const { AuthingRnSdk } = NativeModules;

const Guard = ({
    userPoolId,
    options = {},
    onLogin = (userInfo) => { },
    onLoginError = error => { },
    onSocialLoad = socialList => { },
    onSocialUnload = error => { },
    onRegister = userInfo => { },
    onRegisterError = error => { },
    onEmailSent = params => { },
    onEmailSentError = error => { },
    onResetPassword = params => { },
    onResetPasswordError = error => { },
}) => {
    const guardRef = useRef(null)
    // 用户池信息
    const injectGuardOptions = `
  window.ReactNativeWebView.GuardConfig = {
    userPoolId: '${userPoolId}',
    options: ${JSON.stringify(options)}
  }
  `

    // 写死的配置项，不管开发者怎么设置，不然会出问题
    options.hideClose = true
    options.isNative = true
    options.isSSO = false

    function sendNativeLoginResponse(loginType, success, data) {
        guardRef.current.injectJavaScript(`
window.ReactNativeWebView.nativeLoginResponse = {
    loginType: '${loginType}',
    success: ${success},
    data: ${JSON.stringify(data)}
}
`)
    }

    let guardSrc = 'http://cdn.jsdelivr.net/npm/@authing/guard/dist/Guard.umd.min.js'
    // let guardSrc = 'http://192.168.2.16:8082/dist/Guard.umd.min.js'

    let html = `
<!DOCTYPE html>
<html lang="zh-cn">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <link rel="icon" href="https://fe-static.authing.cn/dist/favicon.png" />
  <title>Authing SSO</title>
  <script src=${JSON.stringify(guardSrc)}></script>
</head>
<body>
  <noscript>
    <strong>We're sorry but sso doesn't work properly without JavaScript enabled.
      Please enable it to continue.</strong>
  </noscript>
  <div class="authing-loading-circle screen-center" id="loading"></div>
  <div id="app"></div>
</body>
<script>
const guard = new Guard(${JSON.stringify(userPoolId)}, ${JSON.stringify(options)});
</script>
</html>
`

    async function loginByAlipay() {
        let domain = ""
        if (options.host && options.host.oauth) {
            domain = options.host.oauth.replace('/graphql', '')
        } else {
            domain = "https://oauth.authing.cn"
        }
        const getAuthInfoUrl = `${domain}/oauth/alipaymobile/authinfo/${userPoolId}`
        const getUserInfoUrl = `${domain}/oauth/alipaymobile/redirect/${userPoolId}`
        let response = await fetch(getAuthInfoUrl)
        let responseJson = await response.json()
        if (responseJson.code === 200) {
            const authInfo = responseJson.data
            try {
                let response = await AuthingRnSdk.authWithInfo(authInfo);
                // console.log(response)
                let { resultStatus, result, memo } = response;
                let { success, result_code, auth_code, user_id } = QueryString.parse(result);
                // 请求处理成功
                if (resultStatus == 9000 && result_code == 200) {
                    response = await fetch(getUserInfoUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            auth_code,
                            result_code,
                            user_id
                        })
                    })
                    responseJson = await response.json()
                    const success = responseJson.code === 200
                    const data = responseJson.data
                    sendNativeLoginResponse("alipaymobile", success, data)
                } else {
                    let errmsg = ""
                    if (resultStatus == 4000) {
                        errmsg = "系统异常"
                    } else if (resultStatus == 6001) {
                        errmsg = "中途取消"
                    } else if (resultStatus == 6002) {
                        errmsg = "网络连接出错"
                    }
                    sendNativeLoginResponse("alipaymobile", false, errmsg)
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    return (
        <View style={{ flex: 1, flexDirection: 'column' }}>
            <WebView
                ref={guardRef}
                source={{
                    // uri: domain
                    html: html
                }}
                originWhitelist={['*']}
                renderLoading={
                    <ActivityIndicator
                        color="#009b88"
                        size="large"
                        style={{
                            flex: 1,
                            justifyContent: 'center'
                        }}
                    />
                }
                injectedJavaScript={injectGuardOptions}
                onMessage={e => {
                    const eventDetail = JSON.parse(e.nativeEvent.data)
                    let { eventName, params } = eventDetail;

                    // 错误信息只不显示 trackback 等无用信息
                    if (params.message && params.message.message) {
                        params = params.message
                    }
                    // console.log(eventName, params)
                    switch (eventName) {
                        case "login":
                            onLogin(params)
                            break
                        case "login-error":
                            onLoginError(params)
                            break
                        case "social-load":
                            onSocialLoad(params)
                            break
                        case "social-unload":
                            onSocialUnload(params)
                            break
                        case "register":
                            onRegister(params)
                            break
                        case "register-error":
                            onRegisterError(params)
                            break
                        case "email-sent":
                            onEmailSent(params)
                            break
                        case "email-sent-error":
                            onEmailSentError(params)
                            break
                        case "reset-password":
                            onResetPassword(params)
                            break
                        case "reset-password-error":
                            onResetPasswordError(params)
                            break
                        case "form-closed":
                            onGuardClosed()
                            break
                        case "start-native-login":
                            if (params === "alipaymobile") {
                                loginByAlipay()
                            }
                            break
                    }
                }}
                onContentProcessDidTerminate={() => guardRef.current.reload()}
            />
        </View>

    );
};


module.exports = {
    Guard
}