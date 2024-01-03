class visualizationBond{
    constructor (visualizer, object, image){
        this.visualizer = visualizer;
        object.setVisualizationBond(this);
        this.image = image;
        this.object = object;
    }
    getObjectImagePair(){
        return {
            object: this.object,
            image: this.image
        }
    }
}

class SVGRender{//ADD CULLING
    static create(obj){
        return new SVGRender(obj);
    }
    constructor(obj){
        this.objectToFollow = undefined;//physical object that viewport follows
        this.objectToFollowDeltas = [0, 0];
        this.pointTopLeft = [0, 0];//coordinates in xy that top left angle of the screen corresponds to
        this.scale = 1//is used to transfer coordinates from simulation to window
        this.visualizationBonds = [];
        this.width = obj.options.width;
        this.height = obj.options.height;
        this.engine = obj.engine;
        this.SVGCanvas = SVG().addTo(obj.element);
        this.SVGCanvas.attr({
            width: this.width,
            height: this.height
        });         
        Matter.Events.on(this.engine, "afterUpdate", (event)=>{
            this.update();
        });
        Matter.Events.on(this.engine, "objectAdded", (event)=>{
            this.addObject(event.physicalObject);
        });
    }
    addObject(physicalObject){
        let xPosition = physicalObject.getBody().position.x;
        let yPosition = physicalObject.getBody().position.y;
        let objParts = physicalObject.getBody().parts;
        let SVGObject = this.SVGCanvas.group();
        for(let i = 0; i < objParts.length; i++){
            if(i === 0 && objParts.length > 1){
                continue;
            };
            let objPartVertices = physicalObject.getBody().parts[i].vertices;
            let vertices = [];
            for (let i = 0; i < objPartVertices.length; i++){
                vertices.push(objPartVertices[i].x - xPosition, objPartVertices[i].y - yPosition);
            };
            SVGObject.polygon(vertices).fill("#D3B0FF").stroke("#D3B0FF");
        };
        SVGObject.cx(this.scale*(xPosition - this.pointTopLeft[0]));
        SVGObject.cy(this.scale*(yPosition - this.pointTopLeft[1]));
        let bond = new visualizationBond(this, physicalObject, SVGObject);
        this.visualizationBonds.push(bond);
    };
    addVisualizationBond(bond){
        this.visualizationBonds.push(bond);
    };
    update(){
        if(this.objectToFollow){
            this.pointTopLeft = [
                this.objectToFollowDeltas[0] + this.objectToFollow.getBody().position.x,
                this.objectToFollowDeltas[1] + this.objectToFollow.getBody().position.y
            ];
        };
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let pair = this.visualizationBonds[i].getObjectImagePair();
            let img = pair.image;
            let obj = pair.object;
            img.cx(this.scale*(obj.getBody().position.x - this.pointTopLeft[0]));
            img.cy(this.scale*(obj.getBody().position.y - this.pointTopLeft[1]));
            img.transform({ rotate: obj.getBody().angle});
        };
    }
    scaleView(factor, screenX, screenY){
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let img = this.visualizationBonds[i].getObjectImagePair().image;
            this.pointTopLeft[0] += (1 - 1/factor)*screenX/this.scale;
            this.pointTopLeft[1] += (1 - 1/factor)*screenY/this.scale;
            img.size(factor*img.width(), null);
        };
        this.scale *= factor;
        this.update();//I don't want to use another formula
    };
    moveView(dScreenX, dScreenY){
        this.pointTopLeft[0] += dScreenX/this.scale;
        this.pointTopLeft[1] += dScreenY/this.scale;
        this.update();
    };
    followObject(object){
        if(!object){
            this.objectToFollow = object;
            return;
        }
        this.objectToFollow = object;
        this.objectToFollowDeltas = [
            this.pointTopLeft[0] - this.objectToFollow.getBody().position.x,
            this.pointTopLeft[1] - this.objectToFollow.getBody().position.y
        ];
        this.update();
    };
    resetView(){
        this.objectToFollow = undefined;
        this.pointTopLeft = [0, 0];
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let img = this.visualizationBonds[i].getObjectImagePair().image;
            img.size(img.width()/this.scale, null);
        };
        this.scale = 1;
        this.update();
    }
}