from datetime import datetime, timezone
from uuid import uuid4

PRODUCTS = [
    {"id":"sofa","name":"云栖 · 亚麻模块沙发","category":"沙发","material":"高密度海绵 / 亚麻混纺","size":"240 × 95 × 78 cm","width":2.4,"depth":.95,"price":9800,"image":"/assets/sofa.png","color":"#d9d1bf","description":"低重心的舒展比例，为日常留出柔软的位置。可拆洗面料，让自然质感融入长久的生活。"},
    {"id":"cabinet","name":"栖木 · 黑胡桃木边柜","category":"柜体","material":"北美黑胡桃 / 木蜡油","size":"180 × 40 × 72 cm","width":1.8,"depth":.4,"price":6800,"image":"/assets/cabinet.png","color":"#8b6449","description":"把收纳融入安静的木纹。自然温润的黑胡桃，与留白墙面相得益彰。"},
    {"id":"table","name":"云岩 · 洞石圆几","category":"茶几","material":"天然洞石 / 哑光处理","size":"Ø 80 × 35 cm","width":.8,"depth":.8,"price":2080,"image":"/assets/table.png","color":"#c8baa0","description":"天然石材的细小孔隙与纹理，让每一件都有独特的呼吸感。"},
    {"id":"wood","name":"山野 · 自然橡木地板","category":"建材","material":"多层实木 / 橡木表层","size":"180 × 18 cm · 每平方米","width":0,"depth":0,"price":328,"image":"/assets/study.jpg","color":"#ae8b5f","description":"温暖的原木纹理，与自然光一起塑造空间的底色。示例价格为每平方米。"}
]
STYLES = [
    {"id":"natural","name":"自然原木","image":"/assets/living.png","colors":["#d8c4a7","#717b5b","#8b6040"],"description":"以自然材质与温润色调，重构家的松弛感。保留通透的采光，让木质、绿意与织物相互呼应。"},
    {"id":"minimal","name":"现代简约","image":"/assets/bedroom.png","colors":["#e1ded7","#b6b2aa","#85877f"],"description":"减去多余的装饰，以清晰的线条、柔和的光线与留白，让空间回归舒适与实用。"},
    {"id":"vintage","name":"温暖中古","image":"/assets/vintage.jpg","colors":["#b5804a","#8f5936","#77644d"],"description":"以深浅木色与经典家具比例，营造有时间感的居所。局部照明让生活多一层温暖。"}
]

def now():
    return datetime.now(timezone.utc).isoformat()

def new_project(title="未命名的理想空间", room_type="客厅", width=5.6, length=5.0, index=0):
    assets = ["/assets/living.png","/assets/study.jpg","/assets/bedroom.png"]
    return {
        "id":uuid4().hex, "title":title, "room_type":room_type, "client":"林女士",
        "budget":30000, "brief":"希望以自然、舒适为主，保留充足的采光，加入绿植与木质元素，营造放松的居家氛围。",
        "cover":assets[index % 3], "original":"", "style":"natural", "status":"设计中", "created_at":now(), "updated_at":now(),
        "room":{"width":width,"length":length,"height":2.8,"shape":"rectangle","confirmed":True,
            "openings":[{"id":"door-1","type":"door","wall":0,"position":.8,"width":.9},{"id":"window-1","type":"window","wall":2,"position":width/2,"width":2.0}],
            "furniture":[{"id":"f-sofa","product_id":"sofa","x":.4,"y":.3,"rotation":0},{"id":"f-table","product_id":"table","x":1.6,"y":1.8,"rotation":0},{"id":"f-cabinet","product_id":"cabinet","x":.5,"y":length-.65,"rotation":0}]},
        "product_ids":["sofa","cabinet","table"], "versions":[{"id":uuid4().hex,"name":"自然原木","style":"natural","image":assets[index%3],"mode":"demo","rationale":STYLES[0]["description"],"created_at":now()}]
    }
