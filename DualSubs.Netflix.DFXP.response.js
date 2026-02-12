/*
 * DualSubs Netflix DFXP 字幕注入脚本
 * 
 * 功能：拦截 Netflix MSL API 的字幕请求响应，
 *       从指定 URL 下载 DFXP 格式字幕并注入
 * 平台：Shadowrocket / Surge
 * 
 * 工作方式：拦截 *.oca.nflxvideo.net 字幕响应，
 *           直接用 DFXP 内容替换
 */

/***************** 配置区域 - 修改此处 *****************/

const DFXP_SUBTITLE_URL = "https://raw.githubusercontent.com/liworlford/KivoSub/refs/heads/main/WeatheringwithYou2019JAPANESE1080pBluRayx264DTS-FGTch.dfxp";

/***************** 配置区域结束 *****************/

const NAME = "DualSubs.Netflix.DFXP";

function log(...args) {
    console.log(`[${NAME}]`, ...args);
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

/***************** 主处理逻辑 *****************/
(async () => {
    log(`⚠ 拦截到请求: ${$request.url}`);

    if (!DFXP_SUBTITLE_URL || DFXP_SUBTITLE_URL === "https://example.com/your-subtitle.dfxp") {
        log(`⚠ DFXP_SUBTITLE_URL 未配置，跳过`);
        $done($response);
        return;
    }

    // 检测是否为字幕请求（通过 Content-Type 判断）
    const contentType = $response.headers?.["Content-Type"] || $response.headers?.["content-type"] || "";
    const contentLength = parseInt($response.headers?.["Content-Length"] || $response.headers?.["content-length"] || "0", 10);

    // 只处理字幕（文本类型、体积较小），跳过视频流（二进制、体积大）
    const isSubtitle = contentType.includes("text/") ||
                       contentType.includes("application/xml") ||
                       contentType.includes("application/ttml") ||
                       contentType.includes("application/vtt") ||
                       contentLength < 1048576; // 小于 1MB 才处理

    const isVideo = contentType.includes("video/") ||
                    contentType.includes("application/octet-stream") ||
                    contentLength > 5242880; // 大于 5MB 一定是视频

    if (isVideo) {
        log(`⏭ 跳过视频流: Content-Type=${contentType}, Content-Length=${contentLength}`);
        $done($response);
        return;
    }

    // 额外检查：如果 body 太大也跳过
    if ($response.body && typeof $response.body === "string" && $response.body.length > 2097152) {
        log(`⏭ 跳过大文件: body length=${$response.body.length}`);
        $done($response);
        return;
    }

    log(`📝 检测到字幕请求, Content-Type=${contentType}`);
    log(`⬇️ 正在下载 DFXP 字幕: ${DFXP_SUBTITLE_URL}`);

    try {
        const dfxpResponse = await httpGet(DFXP_SUBTITLE_URL);

        if (dfxpResponse && dfxpResponse.body) {
            log(`✅ DFXP 下载成功, 大小: ${dfxpResponse.body.length} 字节`);

            $response.body = dfxpResponse.body;

            if ($response.headers) {
                // 不要修改 Content-Type！保持原始类型让 Netflix 客户端正确解析
                // Netflix 自己知道期望什么格式
                delete $response.headers["Content-Length"];
                delete $response.headers["content-length"];
                delete $response.headers["Content-Encoding"];
                delete $response.headers["content-encoding"];
            }

            log(`✅ DFXP 字幕注入完成`);
        } else {
            log(`❌ DFXP 下载失败: 响应为空`);
        }
    } catch (error) {
        log(`❌ DFXP 下载出错: ${error}`);
    }
})()
    .catch(e => log(`❌ 脚本错误: ${e}`))
    .finally(() => $done($response));
