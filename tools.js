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
            index = this.activationHandlers.indexOf(eventHandler);
            if (index){
                this.activationHandlers.splice(index, 1);
            };            
        }else if(eventName === "deactivation"){
            index = this.deactivationHandlers.indexOf(eventHandler);
            if (index){
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
        this.visualizer.deactivateTools();
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
        this.spaceTolerance = 3; //px - Default value(condition for insta click event)
        this.timeTolerance = 100; //ms - Default value(condition for insta click event)
    };
    getParameters(){
        return [[(v) => {this.spaceTolerance = v}, "spaceTolerance (0;+inf) px - Default value(condition for insta click event)"],
                [(v) => {this.timeTolerance = v}, "timeTolerance (0;+inf) ms - Default value(condition for insta click event)"],]
    };
    activate(){
        this.visualizer.deactivateTools();
        this.visualizer.getJQuery().on("mousedown.selection", (e) => {
            console.log(e);
            if(e.originalEvent.button === 0){
                this.mouseDown = true;
            };
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mouseup.selection", (e) => {
            if(e.originalEvent.button === 0){
                this.mouseDown = false;
            };
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mouseleave.selection", (e) => {
            this.mouseDown = false;
        })
        .on("mousemove.selection",  (e) => {
            if (this.mouseDown) {
                let dScreenX = this.mousePosition[0] - e.offsetX;
                let dScreenY = this.mousePosition[1] - e.offsetY;
                this.visualizer.moveView(dScreenX, dScreenY);
            }
            this.mousePosition = [e.offsetX, e.offsetY];
        })
        .on("mousewheel.selection", (e) => {
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
        this.visualizer.getJQuery().off(".selection");
    };
}