import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import buildURL from "./buildURL.ts";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { AxiosError, AxiosPromise, InternalAxiosRequestConfig } from "axios";
import { buildFullPath } from "./buildFullPath.ts";

const base64Encode = (str: string) =>
  Buffer.from(str, "binary").toString("base64");

const buildBasicAuthorization = (basicCredentials: any) => {
  const username = basicCredentials.username || "";
  const password = basicCredentials.password
    ? encodeURIComponent(basicCredentials.password)
    : "";
  return {
    Authorization: `Basic ${base64Encode(`${username}:${password}`)}`,
  };
};

const buildJWTAuthorization = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
  };
};

const transform = async (data: Response, type: string): Promise<any> => {
  switch (type) {
    case "arraybuffer": {
      return await data.arrayBuffer();
    }
    case "blob": {
      return await data.blob();
    }
    case "formdata": {
      return await data.formData();
    }
    case "json": {
      return await data.json();
    }
    case "text": {
      return await data.text();
    }
    default: {
      throw new Error("Response type unsupported type: " + type);
    }
  }
};

export interface TauriAxiosRequestConfig extends InternalAxiosRequestConfig {
  jwt?: string;
}

export const axiosTauriApiAdapter = (
  config: TauriAxiosRequestConfig,
): AxiosPromise => {
  return new Promise(async (resolve, reject) => {
    const requestUrl = buildURL(
      buildFullPath(config.baseURL, config.url),
      config.params,
      config.paramsSerializer,
    );
    const requestConfig = {
      method: config.method,
      headers: {
        ...config.headers,
        ...(config.auth && buildBasicAuthorization(config.auth)),
        ...(config.jwt && buildJWTAuthorization(config.jwt)),
      },
      connectTimeout: config.timeout! < 1000 ? undefined : config.timeout,
      maxRedirections: config.maxRedirects,
      body: config.data,
      signal: config.signal,
    };

    try {
      // @ts-ignore
      const response = await tauriFetch(requestUrl, requestConfig);

      // @ts-ignore
      const statusText: ReasonPhrases =
        ReasonPhrases[StatusCodes[response.status]];
      const responseType = config.responseType || "json";

      if (response.ok) {
        const data = await transform(response, responseType);
        return resolve({
          data: data,
          status: response.status,
          statusText: statusText,
          // @ts-ignore
          headers: {
            ...response.headers,
          },
          config: config,
        });

        // .catch((reason) => {
        // return reject(
        //   new AxiosError(reason, AxiosError.ERR_BAD_RESPONSE, config, {
        //     url: requestUrl,
        //     ...requestConfig,
        //   }),
        // );
        // });
        // } else {
        //   return resolve({
        //     data: response.body,
        //     status: response.status,
        //     statusText: statusText,
        //     // @ts-ignore
        //     headers: {
        //       ...response.headers,
        //     },
        //     config: config,
        //   });
        // }
      } else {
        const body = await transform(response, responseType).catch(() => null);
        return reject(
          new AxiosError(
            "Request failed with status code " + response.status,
            [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
              Math.floor(response.status / 100) - 4
            ],
            config,
            { url: requestUrl, ...requestConfig },
            {
              config: config,
              data: body,
              // @ts-ignore
              headers: response.headers,
              status: response.status,
              statusText: statusText,
            } as any,
          ),
        );
      }

      // else {
      //   if (response.body !== null) {
      //     transform(response, responseType)
      //       .then((body) => {
      //         return reject(
      //           new AxiosError(
      //             "Request failed with status code " + response.status,
      //             [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
      //               Math.floor(response.status / 100) - 4
      //             ],
      //             config,
      //             {
      //               url: requestUrl,
      //               ...requestConfig,
      //             },
      //             {
      //               config: config,
      //               data: body,
      //               // @ts-ignore
      //               headers: response.headers,
      //               status: response.status,
      //               statusText: statusText,
      //             },
      //           ),
      //         );
      //       })
      //       .catch((reason) => {
      //         return reject(
      //           new AxiosError(reason, AxiosError.ERR_BAD_RESPONSE, config, {
      //             url: requestUrl,
      //             ...requestConfig,
      //           }),
      //         );
      //       });
      //   } else {
      //     return reject(
      //       new AxiosError(
      //         "Request failed with status code " + response.status,
      //         [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
      //           Math.floor(response.status / 100) - 4
      //         ],
      //         config,
      //         {
      //           url: requestUrl,
      //           ...requestConfig,
      //         },
      //         {
      //           config: config,
      //           data: response.body,
      //           // @ts-ignore
      //           headers: response.headers,
      //           status: response.status,
      //           statusText: statusText,
      //         },
      //       ),
      //     );
      //   }
      // }
    } catch (error: any) {
      reject(new AxiosError(error, AxiosError.ERR_BAD_REQUEST, config));
    }
  });
};
