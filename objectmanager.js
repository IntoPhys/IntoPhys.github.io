//contains default settings for creating objects
class ObjectMannager{
    constructor (engine){
        this.globalForces = [];
        this.engine = engine;
        this.objects = [];
        Matter.Events.on(this.engine, "objectAdded", (event)=>{
            this.objects.push(event.physicalObject);
            for(let f in this.globalForces){
                event.physicalObject.attachForce(this.globalForces[f]);
            };
        });
    };
    getGlobalForces(){
        return this.globalForces;
    };
    addGlobalForce(force){
        for(let o in this.objects){
            o.attachForce(force);
        };
        this.globalForces.push(force);
    };
    removeGlobalForce(force){

    };//TODO
}