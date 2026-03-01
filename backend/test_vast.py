import requests
import xml.etree.ElementTree as ET

def resolve_vast(vast_tag_url):
    response = requests.get(vast_tag_url, timeout=5)
    root = ET.fromstring(response.text)
    inline = root.find('.//InLine') or root.find('.//Wrapper')
    creatives = inline.findall('.//Creative')
    media_file_url = None
    click_through_url = None
    for creative in creatives:
        linear = creative.find('Linear')
        if linear is not None:
            video_clicks = linear.find('VideoClicks')
            if video_clicks is not None:
                click_through = video_clicks.find('ClickThrough')
                if click_through is not None:
                    click_through_url = click_through.text.strip() if click_through.text else None
            media_files = linear.find('MediaFiles')
            if media_files is not None:
                for mf in media_files.findall('MediaFile'):
                    if mf.get('type') == 'video/mp4':
                        media_file_url = mf.text.strip() if mf.text else None
                        break
        if media_file_url:
            break
    print(f"Video URL: {media_file_url}\nClick URL: {click_through_url}")

resolve_vast("https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast")
