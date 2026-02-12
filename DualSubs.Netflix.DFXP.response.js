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
                "Accept": "*/*"
            }
        };

        // Shadowrocket 里加这个 header 可以跳过自身脚本处理，防止循环
        if (typeof $rocket !== "undefined") {
            options.headers["X-Surge-Skip-Scripting"] = "true";
        }

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

/**
 * 将 DFXP (ttaf1) 格式转换为 Netflix 兼容的 TTML 格式
 */
function convertDfxpToNetflixTtml(dfxpContent) {
    log("🔄 开始转换 DFXP → Netflix TTML");

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

    if (subtitles.length === 0) {
        log("❌ 未提取到任何字幕条目");
        return null;
    }

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

    log(`✅ TTML 生成完成, 大小: ${ttml.length} 字节`);
    return ttml;
}

/***************** 主处理逻辑 *****************/
(async () => {
    notify(NAME, "🎬 脚本已触发", `URL: ${$request.url.substring(0, 80)}...`);
    log(`⚠ 拦截到请求: ${$request.url}`);

    if (!DFXP_SUBTITLE_URL || DFXP_SUBTITLE_URL === "https://example.com/your-subtitle.dfxp") {
        log(`⚠ DFXP_SUBTITLE_URL 未配置`);
        $done($response);
        return;
    }

    // ===== 方法1: 尝试用 $httpClient 下载 =====
    let dfxpBody = null;
    try {
        log(`⬇️ 方法1: $httpClient 下载`);
        const resp = await httpGet(DFXP_SUBTITLE_URL);
        if (resp && resp.body && resp.body.length > 100) {
            dfxpBody = resp.body;
            log(`✅ 方法1成功, 大小: ${dfxpBody.length}`);
        }
    } catch (e1) {
        log(`⚠ 方法1失败: ${e1}`);
        notify(NAME, "⚠ 方法1失败", `${e1}`);

        // ===== 方法2: 用 fetch API (部分环境支持) =====
        try {
            if (typeof fetch !== "undefined") {
                log(`⬇️ 方法2: fetch API`);
                const resp2 = await fetch(DFXP_SUBTITLE_URL);
                dfxpBody = await resp2.text();
                log(`✅ 方法2成功, 大小: ${dfxpBody.length}`);
            }
        } catch (e2) {
            log(`⚠ 方法2也失败: ${e2}`);
        }
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
            log(`✅ 字幕注入完成`);
        } else {
            notify(NAME, "❌ 字幕转换失败", "DFXP解析出0条字幕");
        }
    } else {
        notify(NAME, "❌ 所有下载方法均失败", "无法获取DFXP文件");
        log(`❌ 所有下载方法均失败`);
    }
})()
    .catch(e => {
        notify(NAME, "❌ 脚本异常", `${e}`);
        log(`❌ 脚本异常: ${e}`);
    })
    .finally(() => $done($response));
