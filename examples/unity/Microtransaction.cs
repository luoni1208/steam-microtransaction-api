// Install http://steamworks.github.io/ to use this script
// This script is just an example but you can use as you please
using Steamworks;
using UnityEngine;
using Jazz.http;
using System.Collections;
using System.Collections.Generic;

public class Microtransaction : MonoBehaviour
{
    [SerializeField] private HttpSettingsEditor clientSettings;

    // finish transaction callback
    protected Callback<MicroTxnAuthorizationResponse_t> m_MicroTxnAuthorizationResponse;

    private HttpApi m_internalHttpApi;

    private int currentOrder = 1000;

    private string currentTransactionId = "";

    // unity awake function    
    private void Awake() 
    {
        // initialize the callback to receive after the purchase
       m_MicroTxnAuthorizationResponse = Callback<MicroTxnAuthorizationResponse_t>.Create(OnMicroTxnAuthorizationResponse); 

       m_internalHttpApi = new HttpApi(clientSettings.GenerateSettings());
    }

    // unity update function
    private void Update()
    {
        if(m_internalHttpApi != null)
        {
            m_internalHttpApi.Update();
        }
    }

    bool _isInPurchaseProcess = false;

    int currentCoins = 100;

    void OnGUI()
    {
        GUILayout.Label(currentCoins.ToString());
        if(GUILayout.Button("Buy 1000 Coins"))
        {
            this._isInPurchaseProcess = true;
            this.InitializePurchase();
        }
    }

    // This callback is called when the user confirms the purchase
    // See https://partner.steamgames.com/doc/api/ISteamUser#MicroTxnAuthorizationResponse_t
    private void OnMicroTxnAuthorizationResponse(MicroTxnAuthorizationResponse_t pCallback) 
    {
        if(pCallback.m_bAuthorized == 1)
        {
            this.FinishPurchase(pCallback.m_ulOrderID.ToString());
        }
        Debug.Log("[" + MicroTxnAuthorizationResponse_t.k_iCallback + " - MicroTxnAuthorizationResponse] - " + pCallback.m_unAppID + " -- " + pCallback.m_ulOrderID + " -- " + pCallback.m_bAuthorized);
    }

    // To understand how to create products
    // see https://partner.steamgames.com/doc/features/microtransactions/implementation
    public void InitializePurchase()
    {
        string userId = SteamUser.GetSteamID().ToString();

        String orderId = currentOrder;

        HttpRequestArgs argsRequest = new HttpRequestArgs();
        argsRequest.data.Add("itemId", "item_id_1");
        argsRequest.data.Add("steamUser", userId);
        argsRequest.data.Add("currency", 199); // equal to $1.99
        argsRequest.data.Add("orderId", orderId);
        argsRequest.data.Add("itemDescription","1000 Coins");
        argsRequest.data.Add("category","Gold");

        // you can use your own library to call the API if you want to.
        this.MakeApiCall("InitPurchase",argsRequest, (HttpJsonResponse response) => 
            {
                ApiReturnTransaction ret = JsonUtility.FromJson<ApiReturnTransaction>(response.rawResponse);
                if(ret.transid != "")
                {
                    Debug.Log("Transaction initiated. Id:" + ret.transid);
                    this.currentTransactionId = ret.transid;
                }

            },(HttpRequestError error) => {
                Debug.Log(error.message);
            },true,HttpRequestContainerType.POST);
    }

    public void FinishPurchase(string OrderId)
    {
        HttpRequestArgs argsRequest = new HttpRequestArgs();
        argsRequest.data.Add("orderId", orderId.ToString());

        this.MakeApiCall("FinalizePurchase",argsRequest, (HttpJsonResponse response) => 
            {
                ApiReturnTransaction ret = JsonUtility.FromJson<ApiReturn>(response.rawResponse);
                if(ret.success)
                {
                    // after confirmation, you can give the item for the player
                    currentCoins += 1000;
                    Debug.Log("Transaction Finished.");
                    this._isInPurchaseProcess = false;
                }
            },(HttpRequestError error) => {
                Debug.Log(error.message);
            },true,HttpRequestContainerType.POST);
    }

    // call the api    
    private void MakeApiCall(string apiEndPoint, HttpRequestArgs args, HttpRequestContainer.ActionSuccessHandler successCallback, HttpRequestContainer.ActionErrorHandler errorCallback, bool allowQueueing = false,string requestType = HttpRequestContainerType.POST)
    {
        if(m_internalHttpApi != null)
        {
            Dictionary<string, string> extraHeaders = new Dictionary<string, string>();

            args = args ?? new HttpRequestArgs();

            // steam app id
            args.data.Add("appId", "480");

            m_internalHttpApi.MakeApiCall(apiEndPoint, args, successCallback,errorCallback,extraHeaders,requestType,allowQueueing);
        }         
    }

    public class ApiReturnTransaction
    {
        public string transid;
        public string error;
    }

    public class ApiReturn
    {
        public bool success;
        public string error;
    }
}