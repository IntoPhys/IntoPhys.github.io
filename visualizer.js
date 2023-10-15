class PointVisualization{
    constructor(obj, svg){
        this.computed = obj
        this.rendered = svg.circle(3).cx(this.computed.r.x).cy(this.computed.r.y);
    };
    render(){
        this.rendered.cx(this.computed.r.x).cy(this.computed.r.y);
    };
};

class VisualizationBond{
    constructor(obj, svg){
        if(obj instanceof PointMass){
            this.rendered = new PointVisualization(obj, svg);
        };
    };
    render(){
        this.rendered.render();
    };
};