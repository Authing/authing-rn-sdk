import QueryString from 'query-string';
import React, { useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeModules } from 'react-native';

const { AuthingRnSdk } = NativeModules;

const version = '2.3.5';

const AuthingGuard = props => {
	const { appId, options } = props;

	const guardRef = useRef(null);

	// 写死的配置项，不管开发者怎么设置，不然会出问题
	options.hideClose = true;
	options.isNative = true;
	options.isSSO = false;

	let staticHtmlHead = `
	<link href='https://cdn.jsdelivr.net/npm/@authing/native-js-ui-components@${version}/lib/index.min.css' rel='stylesheet' ></link>`;

	let staticScript = `var head= document.getElementsByTagName('head')[0];
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.onreadystatechange= function () {}
	script.onload= function(){
		var guard = new AuthingNativeJsUIComponents.AuthingGuard('${appId}')
		// 事件监听
		guard.on('load', (authClient) => console.log(authClient))
		// 发送事件
		Object.entries(AuthingNativeJsUIComponents.GuardEventsCamelToKebabMap).forEach(([evt,e]) => {
			guard.on(e ,(...rest) => {
				window.ReactNativeWebView.postMessage(JSON.stringify({
					evtName: evt,
					params: rest
				}))
			})
		})
	 }
	script.src= 'https://cdn.jsdelivr.net/npm/@authing/native-js-ui-components@${version}';
	head.appendChild(script)`;

	const injectGuardOptions = `
	window.ReactNativeWebView.html={
		head:\`${staticHtmlHead}\`,
		$script:\`${staticScript}\`
	}
`;
	return (
		<View style={{ flex: 1, flexDirection: 'column' }}>
			<WebView
				ref={guardRef}
				source={{
					uri: 'https://console.authing.cn/react-native/webview'
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
					const eventDetail = JSON.parse(e.nativeEvent.data);
					let { evtName, params } = eventDetail;
					props[evtName] && props[evtName](params);
				}}
				onContentProcessDidTerminate={() => guardRef.current.reload()}
			/>
		</View>
	);
};
module.exports = {
	AuthingGuard
};
