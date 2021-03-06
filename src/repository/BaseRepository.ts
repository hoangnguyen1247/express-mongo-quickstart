import * as mongoose from 'mongoose';

import { isObject } from '../utils/TypeUtils';

import { IBaseRepository } from "../abstract/repository/IBaseRepository";

export abstract class BaseRepository<T extends mongoose.Document> implements IBaseRepository {

    protected _baseModel: mongoose.Model<T>;

    protected constructor(baseRepository) {
        this._baseModel = baseRepository;
    }

    findMany = async (page: number, size: number) => {
        const data = await this._baseModel
            .find({}, {}, {
                skip: page * size,
                limit: size,
            });

        const count = await this._baseModel.countDocuments({});

        return [
            data,
            count,
        ];
    };

    search = async (searchKey, searchFields, filterMap, page, size, sortMap, resType) => {
        const query = this._baseModel.find();
        const countQuery = this._baseModel.countDocuments();

        //
        // Select
        const allowResTypes = ["list"];
        const resTypeMap = {
            list: ["id", "createdDate"],
        }
        const selectFields = allowResTypes.includes(resType) ? resTypeMap[resType] : resTypeMap["list"];
        if (Array.isArray(selectFields) && selectFields.length > 0) {
            query.select(selectFields.reduce((accumulator, element, index) => 
                index === 0 ? (accumulator + element) : (accumulator + " " + element), ''));
        }

        //
        // Search
        if (searchKey && Array.isArray(searchFields) && searchFields.length > 0) {
            query.where({
                $or: [
                    ...searchFields.map(item => { return { [item]: searchKey } }),
                ],
            });
            countQuery.where({
                $or: [
                    ...searchFields.map(item => { return { [item]: searchKey } }),
                ],
            });
        }

        //
        // Filter
        const allowFilterCols = [
            "createdDate",
        ];
        if (isObject(filterMap) && Object.keys(filterMap).length > 0) {
            Object.keys(filterMap)
                .filter(fItem => allowFilterCols.indexOf(fItem) > -1)
                .forEach(mItem => {
                    if (mItem === "name") {
                        query.where({ [mItem]: { "$regex": filterMap[mItem], "$options": "i" } });
                        countQuery.where({ [mItem]: { "$regex": filterMap[mItem], "$options": "i" } });
                    } else {
                        query.where({ [mItem]: filterMap[mItem] });
                        countQuery.where({ [mItem]: filterMap[mItem] });
                    }
                });
        }

        //
        // Sort
        const allowSortColumns = [
            "createdDate",
        ];
        if (isObject(sortMap) && Object.keys(sortMap).length > 0) {
            Object.keys(sortMap)
                .filter(fItem => allowSortColumns.indexOf(fItem) > -1)
                .forEach(mItem => {
                    if (mItem === "createdDate") {
                        query.sort({ createdDate: sortMap[mItem] }); // -1 0 1
                        countQuery.sort({ createdDate: sortMap[mItem] });
                    }
                });
        } else {
            query.sort({ name: -1 });
            countQuery.sort({ name: -1 });
        }

        //
        // Offset, limit
        const parsedPage = parseInt(page, 10);
        const parsedSize = parseInt(size, 10);
        if (parsedPage && parsedSize) {
            query.skip(parsedPage * parsedSize).limit(parsedSize);
        }

        const data = await query.exec();
        const count = await countQuery.exec();

        return [
            data,
            count,
        ];
    };

    findOneById = async (id: number) => {
        return await this._baseModel.findById(id);
    };

    findOne = async (filterMap, resType): Promise<any> => {
        return await this._baseModel.findOne(filterMap);
    };

    insert = async (entity: T) => {
        return await this._baseModel.create(entity);
    };

    insertMany = async (entities: T[]) => {
        return await this._baseModel.insertMany(entities);
    };
    
    update = async (id: number, entity: T) => {
        return await this._baseModel.findByIdAndUpdate(id, entity, { new: true });
    };

    delete = async (id: number) => {
        return await this._baseModel.findByIdAndRemove(id);
    };
}
