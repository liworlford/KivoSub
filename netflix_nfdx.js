/**
 * Netflix NFDX 注入脚本
 */

// 你的转换好的 NFDX/XML 字幕链接
const MY_NFDX_URL = "https://raw.githubusercontent.com/liworlford/KivoSub/refs/heads/main/WeatheringwithYou2019JAPANESE1080pBluRayx264DTS-FGTch.xml";

const url = $request.url;
console.log(`[NFDX Inject] 捕获请求: ${url}`);

$httpClient.get(MY_NFDX_URL, function(error, response, data) {
    if (error) {
        console.log(`[NFDX Inject] 下载失败`);
        $done({});
    } else {
        console.log(`[NFDX Inject] 注入数据，长度: ${data.length}`);
        
        // 关键点：伪造 Header
        // 告诉 Netflix App："这是一个标准的 XML 文件"
        // 即使请求的是二进制流，App 通常也能识别文本 XML
        let headers = $response ? $response.headers : {};
        headers['Content-Type'] = 'application/xml'; // 或者 'text/xml'

        $done({
            body: data,
            headers: headers
        });
    }
});
