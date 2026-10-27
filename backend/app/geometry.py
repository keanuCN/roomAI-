import math
from .vendor.room import Room
from .vendor.drawings import draw_plan
from .catalog import PRODUCTS

def room_model(room):
    width, length = room["width"], room["length"]
    shape = {"type":"rectangle","width":width,"length":length}
    if room["shape"] == "alcove":
        shape = {"type":"polygon","points":[[0,0],[width,0],[width,length*.65],[width*.7,length*.65],[width*.7,length],[0,length]]}
    model = Room.from_config({"name":"Room plan","shape":shape,"ceiling_height":room["height"],"confirmed":room["confirmed"]})
    for item in room["openings"]:
        from .vendor.room import Opening
        model.openings.append(Opening(tag="D" if item["type"]=="door" else "W",type=item["type"],wall="w"+str(item["wall"]+1),pos=item["position"],width=item["width"]))
    return model

def validate_room(room, product_ids=None):
    errors = []
    model = room_model(room)
    for opening in room["openings"]:
        wall = model.walls[opening["wall"]]
        if opening["position"] - opening["width"]/2 < -.001 or opening["position"] + opening["width"]/2 > wall.length + .001:
            errors.append("门窗超出所在墙段，请调整位置或宽度")
    catalog = {p["id"]:p for p in PRODUCTS}
    boxes = []
    for item in room["furniture"]:
        product = catalog.get(item["product_id"])
        if not product or product["width"] == 0:
            continue
        w,d = product["width"],product["depth"]
        if item["rotation"] % 180:
            w,d = d,w
        x,y=item["x"],item["y"]
        if x < 0 or y < 0 or x+w > room["width"]+.001 or y+d > room["length"]+.001:
            errors.append(product["name"]+"超出房间边界")
        if room["shape"]=="alcove" and x+w > room["width"]*.7 and y+d > room["length"]*.65:
            errors.append(product["name"]+"进入凹角区域")
        for xx,yy,ww,dd in boxes:
            if x < xx+ww-.01 and x+w > xx+.01 and y < yy+dd-.01 and y+d > yy+.01:
                errors.append("家具发生重叠，请在户型中调整")
        boxes.append((x,y,w,d))
    return {"valid":not errors,"errors":list(dict.fromkeys(errors)),"area":round(model.area(),2)}

def plan_svg(room):
    model = room_model(room)
    catalog = {p["id"]:p for p in PRODUCTS}
    plan = []
    for f in room["furniture"]:
        p=catalog.get(f["product_id"])
        if not p or not p["width"]:
            continue
        w,d=p["width"],p["depth"]
        if f["rotation"]%180:
            w,d=d,w
        plan.append({"x":f["x"],"y":f["y"],"w":w,"d":d,"label":p["id"]})
    return draw_plan(model, {"layout":{"plan":plan}}, title="roomAI / Room plan")

def reference_png(room):
    """Raster reference from the same Roomsmith geometry, without a browser process."""
    from PIL import Image, ImageDraw
    from io import BytesIO
    model=room_model(room)
    image=Image.new("RGB",(1000,900),"#fafaf4")
    d=ImageDraw.Draw(image)
    scale=min(780/room["width"],650/room["length"])
    ox,oy=100,120
    xy=lambda x,y:(round(ox+x*scale),round(oy+y*scale))
    d.polygon([xy(*p) for p in model.outline()],fill="white",outline="#454f3a",width=6)
    for op in model.openings:
        a,b=model.opening_plan_segment(op)
        d.line([xy(*a),xy(*b)],fill="#a77b4d" if op.type=="door" else "#6b9cac",width=10)
    catalog={p["id"]:p for p in PRODUCTS}
    for f in room["furniture"]:
        p=catalog[f["product_id"]]
        w,depth=p["width"],p["depth"]
        if f["rotation"]%180:
            w,depth=depth,w
        if w:
            a,b=xy(f["x"],f["y"]),xy(f["x"]+w,f["y"]+depth)
            d.rectangle([a,b],fill=p["color"],outline="#77796b",width=2)
            d.text((a[0]+5,a[1]+5),p["id"],fill="#333333")
    d.text((100,40),"ROOMAI - MEASURED FLOOR PLAN",fill="#333333")
    d.text((100,65),str(room["width"])+"m x "+str(room["length"])+"m; ceiling "+str(room["height"])+"m",fill="#555555")
    output=BytesIO()
    image.save(output,"PNG")
    return output.getvalue()
