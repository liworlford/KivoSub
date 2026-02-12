/*
 * DualSubs Netflix DFXP 字幕注入脚本
 * 拦截 Netflix 字幕 CDN 响应，下载 DFXP 并转为 Netflix TTML 格式注入
 */

/***************** 配置区域 *****************/
const DFXP_SUBTITLE_URL = "https://raw.githubusercontent.com/liworlford/KivoSub/refs/heads/main/WeatheringwithYou2019JAPANESE1080pBluRayx264DTS-FGTch.dfxp";
/***************** 配置区域结束 *****************/

const NAME = "DualSubs.Netflix.DFXP";

function log(...args) {
    console.log(`[${NAME}]`, ...args);
}

function notify(title, subtitle, message) {
    if (typeof $notification !== "undefined") {
        $notification.post(title, subtitle, message);
    } else if (typeof $notify !== "undefined") {
        $notify(title, subtitle, message);
    }
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const options = {
            url: url,
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                "Accept": "*/*",
                "X-Surge-Skip-Scripting": "true"
            }
        };

        if (typeof $task !== "undefined") {
            $task.fetch(options).then(
                response => resolve(response),
                reason => reject(reason.error || reason)
            );
        } else if (typeof $httpClient !== "undefined") {
            $httpClient.get(options, (error, response, data) => {
                if (error) reject(error);
                else resolve({ status: response.status, body: data });
            });
        } else {
            reject(new Error("Unsupported platform"));
        }
    });
}

function convertDfxpToNetflixTtml(dfxpContent) {
    const subtitles = [];
    const regex = /<p\s+begin="([^"]+)"\s+end="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = regex.exec(dfxpContent)) !== null) {
        subtitles.push({
            begin: match[1],
            end: match[2],
            text: match[3].trim()
        });
    }

    log(`🔄 提取到 ${subtitles.length} 条字幕`);
    if (subtitles.length === 0) return null;

    let ttml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:tickRate="10000000" xml:lang="zh">
<head>
<styling>
<style xml:id="s1" tts:fontFamily="proportionalSansSerif" tts:fontSize="100%" tts:textAlign="center" tts:color="white"/>
</styling>
<layout>
<region xml:id="r1" tts:origin="10% 80%" tts:extent="80% 15%" tts:displayAlign="after" tts:textAlign="center"/>
</layout>
</head>
<body>
<div xml:lang="zh">
`;

    for (const sub of subtitles) {
        const text = sub.text
            .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;")
            .replace(/\n/g, "<br/>");
        ttml += `<p begin="${sub.begin}" end="${sub.end}" region="r1" style="s1">${text}</p>\n`;
    }

    ttml += `</div>
</body>
</tt>`;

    return ttml;
}

/***************** 主处理逻辑 *****************/
(async () => {
    log(`⚠ 拦截到请求: ${$request.url}`);

    // ====== 关键检查：判断原始响应是否为字幕 ======
    // 检查原始 body 是否包含 XML/TTML 字幕特征
    const body = $response.body || "";
    const isXmlSubtitle = (
        body.includes("<?xml") ||
        body.includes("<tt ") ||
        body.includes("<tt>") ||
        body.includes("</tt>") ||
        body.includes("<body>") ||
        body.includes("ttml")
    );

    if (!isXmlSubtitle) {
        // 不是字幕内容，直接放行，不做任何处理
        log(`⏭ 非字幕内容，跳过 (body前50字符: ${body.substring(0, 50)})`);
        $done($response);
        return;
    }

    // 确认是字幕，发送通知
    notify(NAME, "🎬 检测到字幕请求", `body大小: ${body.length}`);
    log(`📝 确认为字幕请求, body大小: ${body.length}`);

    if (!DFXP_SUBTITLE_URL || DFXP_SUBTITLE_URL === "https://example.com/your-subtitle.dfxp") {
        $done($response);
        return;
    }

    let dfxpBody = null;
    try {
        const resp = await httpGet(DFXP_SUBTITLE_URL);
        if (resp && resp.body && resp.body.length > 100) {
            dfxpBody = resp.body;
            log(`✅ DFXP 下载成功, 大小: ${dfxpBody.length}`);
        }
    } catch (e) {
        log(`❌ 下载失败: ${e}`);
        notify(NAME, "❌ 下载失败", `${e}`);
    }

    if (dfxpBody && dfxpBody.length > 100) {
        const netflixTtml = convertDfxpToNetflixTtml(dfxpBody);

        if (netflixTtml) {
            $response.body = netflixTtml;

            if ($response.headers) {
                delete $response.headers["Content-Length"];
                delete $response.headers["content-length"];
                delete $response.headers["Content-Encoding"];
                delete $response.headers["content-encoding"];
            }

            notify(NAME, "✅ 字幕注入成功", `${netflixTtml.length} 字节`);
        } else {
            notify(NAME, "❌ DFXP解析失败", "0条字幕");
        }
    }
})()
    .catch(e => {
        log(`❌ 脚本异常: ${e}`);
    })
    .finally(() => $done($response));
