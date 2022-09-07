import {MikroORM, RequestContext} from "@mikro-orm/core";
import config from "../mikro-orm.config";
import {Config} from "./entities/Config";

async function loadDataBase() {
    global.orm = await MikroORM.init(config);
    global.em = orm.em.getContext();
}


async function testConnection() {
   console.log(orm.em);
}

async function testCreateTask() {
    let config = new Config();
    config.name = "test";
    config.value = "IsOK"

    await em.persistAndFlush(config);
}

export {
    testConnection,
    loadDataBase
}
