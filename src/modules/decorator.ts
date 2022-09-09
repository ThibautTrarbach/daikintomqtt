function serializeWith(serializer: (input: any) => string) : (target: any, propertyKey: string) => void {
    return function(target: any, propertyKey: string) {
        // serialization here is the metadata key (something like a category)
        Reflect.defineMetadata("serialization", serializer, target, propertyKey);
    }
}

function MyDateSerializer(value : any) : string {
    console.log("MyDateSerializer called");
    return "dummy value";
}

export {
    serializeWith,
    MyDateSerializer
}