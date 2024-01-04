//TOOLS CAN NOT CONTAIN SIMILAR EVENT NAMESPACES
class Tool{
    constructor (visualizer){
        this.visualizer = visualizer;
        this.visualizer.addTool(this);
        this.activationHandlers = [];
        this.deactivationHandlers = [];
    };
    getParameters(){
        return []
    };
    activate(){
        for(let i in this.activationHandlers){
            this.activationHandlers[i](this);
        };
    };
    deactivate(){
        for(let i in this.deactivationHandlers){
            this.deactivationHandlers[i](this);
        };
    };
    on(eventName, eventHandler){
        if(eventName === "activation"){
            if (eventHandler instanceof Function){
                this.activationHandlers.push(eventHandler);
            };
        }else if(eventName === "deactivation"){
            if (eventHandler instanceof Function){
                this.deactivationHandlers.push(eventHandler);
            };
        };
    };
    off(eventName, eventHandler){
        if(eventName === "activation"){
            let index = this.activationHandlers.indexOf(eventHandler);
            if (index != -1){
                this.activationHandlers.splice(index, 1);
            };            
        }else if(eventName === "deactivation"){
            let index = this.deactivationHandlers.indexOf(eventHandler);
            if (index != -1){
                this.deactivationHandlers.splice(index, 1);
            };        
        };
    };
};
class NavigationTool extends Tool{
    constructor (visualizer){
        super(visualizer);
        this.mouseDown = false
        this.wheelScaleFactor = 1.1;//default value
    };
    getParameters(){
        return [[(v) => {this.wheelScaleFactor = v}, "wheelScaleFactor (1;+inf)"],
                ]
    };
    activate(){
        this.visualizer.deactivateOtherTools(this);
        this.visualizer.getJQuery().on("mousedown.navigation", (e) => {
            if(e.originalEvent.button === 0){
                this.mouseDown = true;
            };
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mouseup.navigation", (e) => {
            if(e.originalEvent.button === 0){
                this.mouseDown = false;
            };
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mouseleave.navigation", (e) => {
            this.mouseDown = false;
        })
        .on("mousemove.navigation",  (e) => {
            if (this.mouseDown) {
                let dScreenX = this.mousePosition[0] - e.offsetX;
                let dScreenY = this.mousePosition[1] - e.offsetY;
                this.visualizer.moveView(dScreenX, dScreenY);
            }
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mousewheel.navigation", (e) => {
            setTimeout(()=>{
                if (e.originalEvent.wheelDelta < 0){
                    this.visualizer.scaleView(1/wheelScaleFactor, e.offsetX, e.offsetY);
                } else {
                    this.visualizer.scaleView(wheelScaleFactor, e.offsetX, e.offsetY);
                };
            }, 0);
        });
        super.activate();
    };
    deactivate(){
        super.deactivate();
        this.visualizer.getJQuery().off(".navigation");
    };
}

class SelectionTool extends Tool{
    constructor (visualizer){
        super(visualizer);
        this.mouseDown = false
        this.clickTimestamp = undefined;
        this.selectionFrame = undefined;
        this.spaceTolerance = 5; //px - Default value(condition for insta click event)
        this.timeTolerance = 50; //ms - Default value(condition for insta click event)
        this.selectionMode = 1// + 1 - adds to selection; -1 - dletes from slection
    };
    getParameters(){
        return [[(v) => {this.spaceTolerance = v}, "spaceTolerance (0;+inf) px - Default value(condition for insta click event)"],
                [(v) => {this.timeTolerance = v}, "timeTolerance (0;+inf) ms - Default value(condition for insta click event)"],
                [(v) => {this.selectionMode = v}, "timeTolerance (0;+inf) ms - Default value(condition for insta click event)"],]
    };
    BBIntersection(TL1, BR1, TL2, BR2){
        let width = Math.max(BR1[0], BR2[0]) - Math.min(TL1[0], TL2[0]);
        let height =  Math.max(BR1[1], BR2[1]) - Math.min(TL1[1], TL2[1]);
        if ( (width <= (BR1[0] - TL1[0]) + (BR2[0] - TL2[0])) && (height <= (BR1[1] - TL1[1]) + (BR2[1] - TL2[1]))){
            return true;
        }else{
            return false;
        }
    }
    activate(){
        this.visualizer.deactivateOtherTools(this);
        //MOUSEUP OUTSIDE OF SVG BUG PRESENT
        this.visualizer.getJQuery().on("mousedown.selection", (e) => {
            this.clickTimestamp = e.timeStamp;
            if(e.originalEvent.button === 0){
                this.mouseDown = true;
            };
            this.mouseDownPosition = [e.offsetX, e.offsetY];
        })
        .on("mouseup.selection", (e) => {
            this.mouseDown = false;
            if(this.selectionFrame){
                let BBTopLeft = [this.selectionFrame.attr("x"), this.selectionFrame.attr("y")];
                let BBRightBottom = [BBTopLeft[0] + this.selectionFrame.attr("width"), BBTopLeft[1] + this.selectionFrame.attr("height")];
                this.selectionFrame.remove();
                this.selectionFrame = undefined;
                let bonds = this.visualizer.getVisualizationBonds();
                for (let i in bonds){
                    let bbox = bonds[i].getObjectImagePair().image.bbox();
                    if (this.BBIntersection(BBTopLeft, BBRightBottom, [bbox.x, bbox.y], [bbox.x2, bbox.y2])){
                        if(this.selectionMode === 1){
                            bonds[i].select();
                            console.log(bonds[i]);
                        }else if(this.selectionMode === -1){
                            bonds[i].unselect()
                        };  
                    };
                };
            }else{
                let bonds = this.visualizer.getVisualizationBonds();
                for (let i in bonds){
                    if (bonds[i].getObjectImagePair().image.inside(this.mouseDownPosition[0], this.mouseDownPosition[1])){
                        if(this.selectionMode === 1){
                                bonds[i].select();
                        }else if(this.selectionMode === -1){
                            bonds[i].unselect()
                        };
                    };//Does not consider parental position
                    //Can not be terminated, because considers only bounding boxes
                };
            };
        })
        .on("mousemove.selection", (e) => {
            if (this.mouseDown && (e.timeStamp - this.clickTimestamp > this.timeTolerance && Math.hypot(e.offsetX - this.mouseDownPosition[0], e.offsetY - this.mouseDownPosition[1]) > this.spaceTolerance)){
                if(! this.selectionFrame){
                    this.selectionFrame = this.visualizer.getSVGCanvas().rect(1, 1).fill('none').attr({
                        "stroke":"white",
                        "stroke-linecap":"round",
                        "stroke-width": 1,
                        "stroke-dasharray":"3,3"
                    }).move(this.mouseDownPosition[0], this.mouseDownPosition[1]);
                };
            };
            if(this.mouseDown && this.selectionFrame){
                this.selectionFrame.attr({
                    "x": Math.min(e.offsetX, this.mouseDownPosition[0]),
                    "y": Math.min(e.offsetY, this.mouseDownPosition[1]),
                    "height": Math.abs(e.offsetY - this.mouseDownPosition[1]),
                    "width": Math.abs(e.offsetX - this.mouseDownPosition[0]),
                });
            };
        });
        super.activate();
    };
    deactivate(){
        super.deactivate();
        this.visualizer.getJQuery().off(".selection");
    };
}