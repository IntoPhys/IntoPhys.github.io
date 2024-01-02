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

class SVGRender{
    static create(obj){
        return new SVGRender(obj);
    }
    constructor(obj){
        this.visualizationBonds = [];
        this.width = obj.options.width;
        this.height = obj.options.height;
        this.engine = obj.engine;
        this.SVGCanvas = SVG().addTo(obj.element);
        this.SVGCanvas.attr({
            width: this.width,
            height: this.height
        });
        console.log(this.SVGCanvas);          
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
        SVGObject.cx(xPosition);
        SVGObject.cy(yPosition);
        let bond = new visualizationBond(this, physicalObject, SVGObject);
        this.visualizationBonds.push(bond);
    };
    addVisualizationBond(bond){
        this.visualizationBonds.push(bond);
    };
    update(){
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let pair = this.visualizationBonds[i].getObjectImagePair();
            let img = pair.image;
            let obj = pair.object;
            img.cx(obj.getBody().position.x);
            img.cy(obj.getBody().position.y);
            img.transform({ rotate: obj.getBody().angle});
        };
    }
}