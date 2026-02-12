/*
 * Netflix 字幕替换脚本
 * 严格参照 DualSubs/Netflix Shadowrocket 方案
 * pattern: ^https?:\/\/(.+)\.oca\.nflxvideo\.net\/\?o=\d+&v=\d+&e=\d+&t=.+
 * 拦截字幕 CDN 响应并替换为自定义 TTML
 */
const NAME = "KivoSub";

// 通知
if (typeof $notification !== "undefined") {
    $notification.post(NAME, "🎬 脚本触发", "URL: " + $request.url.substring(0, 100));
} else if (typeof $notify !== "undefined") {
    $notify(NAME, "🎬 脚本触发", "URL: " + $request.url.substring(0, 100));
}

// Netflix TTML 字幕（你需要把完整字幕放在这里）
var SUBTITLE = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
+ '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xml:lang="zh">'
+ '<head>'
+ '<styling><style xml:id="s1" tts:color="white" tts:fontFamily="proportionalSansSerif" tts:fontSize="100%" tts:textAlign="center"/></styling>'
+ '<layout><region xml:id="r1" tts:displayAlign="after" tts:extent="80% 15%" tts:origin="10% 80%" tts:textAlign="center"/></layout>'
+ '</head>'
+ '<body><div>'
+ '<p begin="00:00:54.179" end="00:00:57.683" region="r1" style="s1">这是只有我和她才知道的</p>'
+ '<p begin="00:00:58.350" end="00:01:02.062" region="r1" style="s1">关于这个世界秘密的故事</p>'
+ '<p begin="00:01:35.012" end="00:01:38.599" region="r1" style="s1">那仿佛就像闪着微光的水洼</p>'
+ '<p begin="00:01:39.600" end="00:01:43.145" region="r1" style="s1">回过神来，她已冲出医院</p>'
+ '<p begin="00:02:35.697" end="00:02:38.283" region="r1" style="s1">她不自禁地一边祈愿着</p>'
+ '<p begin="00:02:39.034" end="00:02:41.453" region="r1" style="s1">一边穿过了那座鸟居</p>'
+ '<p begin="00:03:03.183" end="00:03:04.226" region="r1" style="s1">鱼？</p>'
+ '<p begin="00:03:17.489" end="00:03:19.074" region="r1" style="s1">回想起来</p>'
+ '<p begin="00:03:19.199" end="00:03:21.952" region="r1" style="s1">那片景色、那天所见的一切</p>'
+ '<p begin="00:03:22.077" end="00:03:23.245" region="r1" style="s1">或许都只是一场梦</p>'
+ '<p begin="00:03:25.455" end="00:03:27.082" region="r1" style="s1">然而那并不是梦</p>'
+ '<p begin="00:03:27.958" end="00:03:31.753" region="r1" style="s1">那个夏日，在那天际之上的我们</p>'
+ '<p begin="00:03:32.838" end="00:03:36.341" region="r1" style="s1">改变了世界的样貌</p>'
+ '<p begin="00:04:00.866" end="00:04:03.785" region="r1" style="s1">（提问：我是16岁的高中生）</p>'
+ '<p begin="00:04:07.038" end="00:04:10.792" region="r1" style="s1">即将发布豪雨特报</p>'
+ '<p begin="00:04:11.501" end="00:04:12.919" region="r1" style="s1">又要下雨了呢</p>'
+ '<p begin="00:04:13.044" end="00:04:14.796" region="r1" style="s1">好不容易才放晴呢…</p>'
+ '<p begin="00:04:17.007" end="00:04:19.634" region="r1" style="s1">在岛上也一直遇到台风</p>'
+ '<p begin="00:04:20.177" end="00:04:21.178" region="r1" style="s1">不好意思，借过</p>'
+ '</div></body></tt>';

// 替换响应体
$response.body = SUBTITLE;

// 处理 headers（参照 DualSubs 源码 response.dev.js 中的做法）
if ($response.headers) {
    if ($response.headers["Content-Encoding"]) $response.headers["Content-Encoding"] = "identity";
    if ($response.headers["content-encoding"]) $response.headers["content-encoding"] = "identity";
    delete $response.headers["Content-Length"];
    delete $response.headers["content-length"];
}

$done($response);
