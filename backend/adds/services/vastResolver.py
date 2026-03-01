import requests
import xml.etree.ElementTree as ET
import logging

logger = logging.getLogger(__name__)

def resolve_vast(vast_tag_url):
    """
    Fetches VAST XML from Google Ad Manager and extracts the best MP4 media file URL
    and the click-through URL.
    Returns a dict with 'videoUrl' and 'clickUrl', or None if parsing fails.
    """
    try:
        logger.info(f"[VAST Resolver] Fetching VAST tag: {vast_tag_url}")
        # Explicit timeout to prevent hanging the Django view
        response = requests.get(vast_tag_url, timeout=5)
        response.raise_for_status()
        
        xml_text = response.text
        root = ET.fromstring(xml_text)
        
        # Navigate standard VAST 3.0 / 4.0 XML structure
        # InLine/Wrapper -> Creatives -> Creative -> Linear -> MediaFiles
        inline = root.find('.//InLine') or root.find('.//Wrapper')
        if inline is None:
            logger.warning("[VAST Resolver] No InLine or Wrapper found in VAST")
            return None
            
        creatives = inline.findall('.//Creative')
        
        media_file_url = None
        click_through_url = None
        
        for creative in creatives:
            linear = creative.find('Linear')
            if linear is not None:
                # 1. Extract Click-through URL
                video_clicks = linear.find('VideoClicks')
                if video_clicks is not None:
                    click_through = video_clicks.find('ClickThrough')
                    if click_through is not None:
                        click_through_url = click_through.text.strip() if click_through.text else None
                        
                # 2. Extract best MP4 MediaFile
                media_files = linear.find('MediaFiles')
                if media_files is not None:
                    for mf in media_files.findall('MediaFile'):
                        if mf.get('type') == 'video/mp4':
                            # In a production system, you might select by bitrate/resolution here.
                            # We just grab the first valid MP4.
                            media_file_url = mf.text.strip() if mf.text else None
                            break
                            
            if media_file_url:
                break
                
        if not media_file_url:
            logger.warning("[VAST Resolver] Could not find an MP4 MediaFile in VAST")
            return None
            
        return {
            "videoUrl": media_file_url,
            "clickUrl": click_through_url
        }
        
    except requests.RequestException as e:
        logger.error(f"[VAST Resolver] Network error fetching VAST: {e}")
        return None
    except ET.ParseError as e:
        logger.error(f"[VAST Resolver] XML Parsing error: {e}")
        return None
    except Exception as e:
        logger.error(f"[VAST Resolver] Unexpected error parsing VAST: {e}")
        return None
