$(document).ready(function(){
    /*选择盒子*/
    $('.bottom-nav .nav-item').click(function(){
        var index = $(this).index();
        $('.bottom-nav .nav-item').removeClass('active');
        $('.page-container .page').removeClass('active');
        $(this).addClass('active');
        $('.page-container .page').eq(index).addClass('active');
    });
    $('.tab-button').click(function(){
        var index = $(this).index();
        $('.tab-button').removeClass('active');
        $('.tab-content').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').eq(index).addClass('active');
    });
    /*各种浮窗打开关闭*/
    /*复制客服*/
    $('.contact-copy-btn').click(function(){
        const $copyBtn = $(this);
        const serviceText = $copyBtn.closest('.flex.items-center.justify-between').find('p').text().trim();        
        navigator.clipboard.writeText(serviceText).then(() => {
            const originalHtml = $copyBtn.html();
            const originalClasses = $copyBtn.attr('class');
            $copyBtn.removeClass('bg-primary').addClass('bg-green-500 hover:bg-green-600').html('<i class="fa fa-check mr-1"></i>已复制');
            setTimeout(() => {
                $copyBtn.attr('class', originalClasses).html(originalHtml);
            }, 3000);
        }).catch(err => {
            console.error('复制失败:', err);
            $('#shareNotification').text('复制失败，请手动复制').addClass('show');
        });
    });
    /*VPN提示*/
    const vpnPopup = $('.tab-content:nth-child(2) .category-card:first');
    vpnPopup.click(function(){
        $('#vpnPopup.share-popup').addClass('active');
    });
    $('#vpnPopup .btn-active').click(function(){
        $('#vpnPopup.share-popup').removeClass('active');
    });
    $('.announcement-bar').click(function(){
        $('#announcementPopup.announcement-popup').addClass('active');
    });    
    $('#announcementPopup .btn-active').click(function(){
        $('#announcementPopup.announcement-popup').removeClass('active');
    });
});
/*
1. 全局平台配置
*/
const platformConfig = {
    qq: {
        name: "QQ",
        scheme: `mqqapi://share/to_friend?src_type=web&url={{link}}&title={{content}}`
    },
    weixin: {
        name: "微信",
        scheme: `weixin://share?url={{link}}&title={{content}}`
    },
    telegram: {
        name: "Telegram",
        /*
        scheme: `tg://msg_url?url={{link}}&text={{content}}`
        */
        scheme: `https://t.me/share/url?url={{link}}&text={{content}}`
    },
    weibo: {
        name: "微博",
        scheme: `sinaweibo://share?url={{link}}&title={{content}}`
    },
    more: {
        name: "系统分享",
        scheme: "system"
    }
};
/*
2. 通用复制文本函数
*/
function copyText(text){
    if(!text){
        return Promise.reject(new Error("无可用复制内容"));
    }    
    if(navigator.clipboard){
        return navigator.clipboard.writeText(text);
    }else{
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        
        const isSuccess = document.execCommand("copy");
        document.body.removeChild(textarea);
        return isSuccess ? Promise.resolve() : Promise.reject(new Error("复制失败，请重试"));
    }
}
/*
3. 通用Toast提示函数
*/
function showToast(message, type = "success"){
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.7); color: #fff; padding: 8px 16px;
        border-radius: 4px; font-size: 14px; z-index: 9999;
        transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}
/*
4. 获取要复制的链接
*/
function getShareLink(){
    const linkInput = document.querySelector("#sharePopup .domain-text");
    return linkInput ? linkInput.value.trim() : "";
}
/*
5. 获取分享内容
*/
function getShareContent(){
    const contentElement = document.querySelector("#sharePopup .share-container h3");
    if(!contentElement || !contentElement.textContent.trim()){
        console.warn("未找到分享内容（H3标签），使用默认标题");
        return "分享内容";
    }
    return contentElement.textContent.trim();
}
/*
6. 唤起对应平台应用
*/
function openPlatform(platform, link, content){
    const config = platformConfig[platform];
    if(!config){
        return Promise.reject(new Error("不支持该分享平台"));
    }
    const scheme = config.scheme.replace("{{link}}", encodeURIComponent(link)).replace("{{content}}", encodeURIComponent(getShareContent()));
    if(config.scheme === "system"){
        if(navigator.share){
            return navigator.share({
                title: getShareContent(),
                url: link
            });
        }
        return Promise.reject(new Error("浏览器不支持系统分享，请手动复制"));
    }
    return new Promise((resolve, reject) => {
        const a = document.createElement("a");
        a.href = scheme;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        const timer = setTimeout(() => {
            reject(new Error(`未检测到${config.name}，请手动分享`));
        }, 3000);
        const handleVisibilityChange = () => {
            if(document.hidden){
                clearTimeout(timer);
                resolve("唤起成功");
            }
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
    });
}
/*
7. 绑定事件
*/
document.addEventListener("DOMContentLoaded", () => {
    const sharePopup = document.querySelector("#sharePopup");
    if(!sharePopup){
        return;
    }
    const copyBtn = sharePopup.querySelector(".btn-copy");
    copyBtn?.addEventListener("click", async () => {
        try{
            await copyText(getShareLink());
            showToast("复制成功");
        }catch (err){
            showToast(`复制失败：${err.message}`, "error");
        }
    });
    sharePopup.addEventListener("click", async (e) => {
        const targetBtn = e.target.closest(".share-platform.btn-active");
        if(!targetBtn){
            return;
        }
        const platform = targetBtn.dataset.platform;
        const shareLink = getShareLink();
        const shareContent = getShareContent();
        try{
            await copyText(shareLink);
            const platformName = platformConfig[platform]?.name || platform;
            showToast(`已复制，正在跳转${platformName}`);
            await openPlatform(platform, shareLink, shareContent);
        } catch (err){
            showToast(`操作失败：${err.message}`, "error");
        }
    });
});