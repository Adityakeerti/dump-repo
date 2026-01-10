from typing import Protocol , List , Dict , Any , Optional

class MemoryPort(Protocol):
    """
    Absolute contract for all memory backends .
    Both Chatbot and Agent Depends only on this ..
    """

    def get_user_profile(self , user_id : str )-> Dict[str,Any]:
        """ Return persistent user metadata and preferences. """
    def update_user_profile(self , user_id : str , data : Dict[str,Any] )->None:
        """ Update the user profile """
    
    # Chat Memory

    def get_recent_messages(self , user_id : str , limit : int = 20 ) -> List [Dict[str,Any]]:
        """ Fetch Last N messages from conversational context """

    def store_message (
        self ,
        user_id : str ,
        role : str ,        # user | chatbot | agent
        content : str ,
        metadata : Optional[Dict[str,Any]] = None 
    ) -> None:
         """ Persist a single chat message """
    
    # Agent task memory 
    def store_agent_task( self , task : Dict[str,Any] ) -> None:
        """ Persist a newly created agent task """
    def update_agent_task( self , task_id : str , data : Dict[str,Any] ) -> None:
        """ Update an existing agent task status """
    def fetch_pending_tasks(self)-> List[Dict[str,Any]]:
        """ Return all the tasks waiting to be executed """

    # Long term memory
    def store_memory_snippet(
        self ,
        user_id : str ,
        content : str ,
        tags : List[str]
    )-> None :
        """ Store distilled long-term memory """
    
    def search_memory(
        self,
        user_id : str ,
        query : str ,
        limit  : int = 5
    ) -> List[str]:
        """ Semantic search over long memory """

