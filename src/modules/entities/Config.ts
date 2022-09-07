import {Entity, Property} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";

@Entity()
export class Config extends BaseEntity {
    @Property()
    name!: string;

    @Property()
    value!: string;
}
