/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import sinon = require("sinon");
import * as chai from "chai";
import sinonChai = require("sinon-chai");

import * as dataServiceRead from "../../lib";
import {
    LookupApi,
    MetadataApi,
    QueryApi
} from "@here/olp-sdk-dataservice-api";

chai.use(sinonChai);

const assert = chai.assert;
const expect = chai.expect;

describe("StatistiscClient", () => {
    let sandbox: sinon.SinonSandbox;
    let getVersionStub: sinon.SinonStub;
    let getPartitionsByIdStub: sinon.SinonStub;
    let quadTreeIndexVolatileStub: sinon.SinonStub;
    let getResourceAPIListStub: sinon.SinonStub;
    const mockedHRN = dataServiceRead.HRN.fromString(
        "hrn:here:data:::mocked-hrn"
    );
    const mockedLayerId = "mocked-layed-id";
    const mockedLayerType = "volatile";
    const fakeURL = "http://fake-base.url";
    const headers = new Headers();
    const mockedQuadKey = {
        row: 1,
        column: 2,
        level: 3
    };

    before(() => {
        sandbox = sinon.createSandbox();
        headers.append("cache-control", "max-age=3600");
    });

    beforeEach(() => {
        quadTreeIndexVolatileStub = sandbox.stub(
            QueryApi,
            "quadTreeIndexVolatile"
        );
        getVersionStub = sandbox.stub(MetadataApi, "latestVersion");
        getPartitionsByIdStub = sandbox.stub(QueryApi, "getPartitionsById");
        getResourceAPIListStub = sandbox.stub(LookupApi, "getResourceAPIList");
        getResourceAPIListStub.callsFake(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify([
                        {
                            api: "query",
                            version: "v1",
                            baseURL:
                                "https://query.data.api.platform.here.com/query/v1"
                        },
                        {
                            api: "blob",
                            version: "v1",
                            baseURL:
                                "https://blob.data.api.platform.here.com/blob/v1"
                        },
                        {
                            api: "metadata",
                            version: "v1",
                            baseURL:
                                "https://query.data.api.platform.here.com/metadata/v1"
                        }
                    ]),
                    { headers }
                )
            )
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("Shoud be initialised with settings", async () => {
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);
    });

    it("Should method fetchQuadTreeIndex provide data with all parameters", async () => {
        const mockedQuadKeyTreeData = {
            subQuads: [
                {
                    version: 12,
                    subQuadKey: "1",
                    dataHandle: "c9116bb9-7d00-44bf-9b26-b4ab4c274665"
                }
            ],
            parentQuads: [
                {
                    version: 12,
                    partition: "23618403",
                    dataHandle: "da51785a-54b0-40cd-95ac-760f56fe5457"
                }
            ]
        };
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        quadTreeIndexVolatileStub.callsFake(
            (builder: any, params: any): Promise<QueryApi.Index> => {
                return Promise.resolve(mockedQuadKeyTreeData);
            }
        );

        const quadTreeIndexRequest = new dataServiceRead.QuadTreeIndexRequest(
            mockedHRN,
            mockedLayerId,
            mockedLayerType
        )
            .withQuadKey(mockedQuadKey)
            .withVersion(42);

        const response = await queryClient.fetchQuadTreeIndex(
            quadTreeIndexRequest
        );

        assert.isDefined(response);
        expect(response).to.be.equal(mockedQuadKeyTreeData);
    });

    it("Should method fetchQuadTreeIndex return error if quadKey is not provided", async () => {
        const mockedErrorResponse = "Please provide correct QuadKey";
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        const quadTreeIndexRequest = new dataServiceRead.QuadTreeIndexRequest(
            mockedHRN,
            mockedLayerId,
            mockedLayerType
        );

        const result = await queryClient
            .fetchQuadTreeIndex(quadTreeIndexRequest)
            .catch(error => {
                assert.isDefined(error);
                assert.equal(mockedErrorResponse, error);
            });
    });

    it("Should method fetchQuadTreeIndex return error if layerId is not provided", async () => {
        const mockedErrorResponse = "Please provide correct Id of the Layer";
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        const quadTreeIndexRequest = new dataServiceRead.QuadTreeIndexRequest(
            mockedHRN,
            "",
            mockedLayerType
        ).withQuadKey(mockedQuadKey);

        const result = await queryClient
            .fetchQuadTreeIndex(quadTreeIndexRequest)
            .catch(error => {
                assert.isDefined(error);
                assert.equal(mockedErrorResponse, error);
            });
    });

    it("Should method fetchQuadTreeIndex return error if catalog version is not provided", async () => {
        const mockedErrorResponse = `Please provide correct catalog version`;
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        getVersionStub.callsFake(
            (
                builder: any,
                params: any
            ): Promise<MetadataApi.VersionResponse> => {
                return Promise.resolve({ version: NaN });
            }
        );

        const quadTreeIndexRequest = new dataServiceRead.QuadTreeIndexRequest(
            mockedHRN,
            mockedLayerId,
            mockedLayerType
        ).withQuadKey(mockedQuadKey);

        const result = await queryClient
            .fetchQuadTreeIndex(quadTreeIndexRequest)
            .catch(error => {
                assert.isDefined(error);
                assert.equal(mockedErrorResponse, error);
            });
    });

    it("Should method fetchQuadTreeIndex return error if catalog version is not provided", async () => {
        const mockedError = "Unknown error";
        const mockedErrorResponse = `Error getting the last catalog version: ${mockedError}`;
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        getVersionStub.callsFake(
            (
                builder: any,
                params: any
            ): Promise<MetadataApi.VersionResponse> => {
                return Promise.reject(mockedError);
            }
        );

        const quadTreeIndexRequest = new dataServiceRead.QuadTreeIndexRequest(
            mockedHRN,
            mockedLayerId,
            mockedLayerType
        ).withQuadKey(mockedQuadKey);

        const result = await queryClient
            .fetchQuadTreeIndex(quadTreeIndexRequest)
            .catch(error => {
                assert.isDefined(error);
                assert.equal(mockedErrorResponse, error);
            });
    });

    it("Should method getPartitionsById provide data with all parameters", async () => {
        const mockedIds = ["1", "2", "13", "42"];
        const mockedLayerId = "fake-layer-id";
        const mockedHRN = dataServiceRead.HRN.fromString(
            "hrn:here:data:::mocked-hrn"
        );
        const mockedPartitionsResponse = {
            partitions: [
                {
                    checksum: "291f66029c232400e3403cd6e9cfd36e",
                    compressedDataSize: 1024,
                    dataHandle: "1b2ca68f-d4a0-4379-8120-cd025640510c",
                    dataSize: 1024,
                    crc: "c3f276d7",
                    partition: "314010583",
                    version: 2
                }
            ]
        };
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        getPartitionsByIdStub.callsFake(
            (builder: any, params: any): Promise<QueryApi.Partitions> => {
                return Promise.resolve(mockedPartitionsResponse);
            }
        );

        const partitionsRequest = new dataServiceRead.PartitionsRequest()
            .withVersion(42)
            .withPartitionIds(mockedIds);

        const response = await queryClient.getPartitionsById(
            partitionsRequest,
            mockedLayerId,
            mockedHRN
        );

        assert.isDefined(response);
        expect(response).to.be.equal(mockedPartitionsResponse);
    });

    it("Should method getPartitionsById return error if partitionIds list is not provided", async () => {
        const mockedErrorResponse = "Please provide correct partitionIds list";
        const mockedLayerId = "fake-layer-id";
        const mockedHRN = dataServiceRead.HRN.fromString(
            "hrn:here:data:::mocked-hrn"
        );
        const settings = new dataServiceRead.OlpClientSettings({
            environment: "mocked-env",
            getToken: () => Promise.resolve("mocked-token")
        });
        const queryClient = new dataServiceRead.QueryClient(settings);
        assert.isDefined(queryClient);

        const partitionsRequest = new dataServiceRead.PartitionsRequest();

        const response = await queryClient
            .getPartitionsById(partitionsRequest, mockedLayerId, mockedHRN)
            .catch(error => {
                assert.isDefined(error);
                assert.equal(mockedErrorResponse, error);
            });
    });
});
