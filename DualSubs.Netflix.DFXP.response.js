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
            headers: { "User-Agent": "Mozilla/5.0" },
            policy: "DIRECT"
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

/**
 * 将 DFXP (ttaf1) 格式转换为 Netflix 兼容的 TTML 格式
 */
function convertDfxpToNetflixTtml(dfxpContent) {
    log("🔄 开始转换 DFXP → Netflix TTML");

    // 提取所有字幕条目
    const subtitles = [];
    const regex = /<p\s+begin="([^"]+)"\s+end="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = regex.exec(dfxpContent)) !== null) {
        subtitles.push({
            begin: convertTimeFormat(match[1]),
            end: convertTimeFormat(match[2]),
            text: match[3].trim()
        });
    }

    log(`🔄 提取到 ${subtitles.length} 条字幕`);

    if (subtitles.length === 0) {
        log("❌ 未提取到任何字幕条目");
        return null;
    }

    // 构建 Netflix 兼容的 TTML
    let ttml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tt="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:tickRate="10000000" xml:lang="zh">
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
        // 转义 XML 特殊字符
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

/**
 * 转换时间格式
 * 输入: "00:00:54.179" (HH:MM:SS.mmm)
 * 输出: "00:00:54.179" (保持不变，Netflix TTML 支持此格式)
 */
function convertTimeFormat(time) {
    // 已经是标准格式，直接返回
    return time;
}

/***************** 主处理逻辑 *****************/
(async () => {
    // 发送通知，确认脚本被触发
    notify(NAME, "🎬 脚本已触发", `URL: ${$request.url.substring(0, 80)}...`);
    log(`⚠ 拦截到请求: ${$request.url}`);

    const contentType = $response.headers?.["Content-Type"] || $response.headers?.["content-type"] || "";
    log(`📋 原始 Content-Type: ${contentType}`);
    log(`📋 原始 body 长度: ${$response.body ? $response.body.length : "无body"}`);

    if (!DFXP_SUBTITLE_URL || DFXP_SUBTITLE_URL === "https://example.com/your-subtitle.dfxp") {
        log(`⚠ DFXP_SUBTITLE_URL 未配置`);
        $done($response);
        return;
    }

    log(`⬇️ 下载 DFXP: ${DFXP_SUBTITLE_URL}`);

    try {
        const dfxpResponse = await httpGet(DFXP_SUBTITLE_URL);

        if (dfxpResponse && dfxpResponse.body) {
            log(`✅ DFXP 下载成功, 大小: ${dfxpResponse.body.length} 字节`);

            // 转换为 Netflix 兼容的 TTML 格式
            const netflixTtml = convertDfxpToNetflixTtml(dfxpResponse.body);

            if (netflixTtml) {
                $response.body = netflixTtml;

                if ($response.headers) {
                    // 删除可能干扰的 header
                    delete $response.headers["Content-Length"];
                    delete $response.headers["content-length"];
                    delete $response.headers["Content-Encoding"];
                    delete $response.headers["content-encoding"];
                }

                notify(NAME, "✅ 字幕注入成功", `${netflixTtml.length} 字节`);
                log(`✅ 字幕注入完成`);
            } else {
                notify(NAME, "❌ 字幕转换失败", "未提取到字幕条目");
                log(`❌ DFXP 转换失败`);
            }
        } else {
            notify(NAME, "❌ 下载失败", "响应为空");
            log(`❌ 下载失败`);
        }
    } catch (error) {
        notify(NAME, "❌ 出错", `${error}`);
        log(`❌ 出错: ${error}`);
    }
})()
    .catch(e => {
        notify(NAME, "❌ 脚本异常", `${e}`);
        log(`❌ 脚本异常: ${e}`);
    })
    .finally(() => $done($response));
