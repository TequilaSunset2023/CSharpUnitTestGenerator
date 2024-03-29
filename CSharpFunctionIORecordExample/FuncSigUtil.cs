// <copyright file="FuncSigUtil.cs" company="Microsoft">
//     Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FodyDemo
{
#pragma warning disable CA1307
#pragma warning disable CA1801
#pragma warning disable CA1724
#pragma warning disable SA1515
#pragma warning disable IDE0057 // Use range operator
#pragma warning disable SA1307 // Accessible fields should begin with upper-case letter
#pragma warning disable SA1502 // Element should not be on a single line
#pragma warning disable CA1051 // Do not declare visible instance fields
#pragma warning disable CA1819 // Mark members as static
#pragma warning disable SA1516 // Elements should be separated by blank line
#pragma warning disable SA1600 // Elements should be documented
#pragma warning disable CA1822 // Mark members as static
#pragma warning disable CS8632 // The annotation for nullable reference types should only be used in code within a '#nullable' annotations context.
#pragma warning disable CA1002
    public class FuncSigUtil
    {
        private static readonly Dictionary<string, string> typeNameConvertDict = new Dictionary<string, string>
        {
            { "Object", "object" },
            { "Void", "void" },
            { "Boolean", "bool" },
            { "Int32", "int" },
            { "Decimal", "decimal" },
            { "String", "string" },
        };

        public static string GetMethodSigFromMethodInfo(MethodInfo methodInfo)
        {
            string returnType = GetTypeSignature(methodInfo.ReturnType);
            string methodName = methodInfo.DeclaringType?.Name + "." + methodInfo.Name;

            string paramsString = "(";
            var parameters = methodInfo.GetParameters();

            foreach (var para in parameters)
            {
                if (paramsString.Last() != '(')
                {
                    paramsString += ", ";
                }
                paramsString += GetTypeSignature(para.ParameterType) + " " + para.Name;
            }

            paramsString += ")";

            return returnType + " " + methodName + paramsString;
        }

        public static string GetTypeSignature(Type type)
        {
            var underlyingType = Nullable.GetUnderlyingType(type);
            var signatureType = underlyingType ?? type;
            var isByRef = signatureType.IsByRef;
            if (isByRef)
            {
                signatureType = signatureType.GetElementType();
            }
            var signature = GetNormalTypeName(signatureType);

            if (IsGeneric(signatureType))
            {
                // Add the generic arguments
                signature += GetGenericType(signatureType.GetGenericArguments());
            }

            if (underlyingType != null)
            {
                signature += "?";
            }

            if (isByRef)
            {
                signature += " ByRef";
            }

            return signature;
        }

        public static List<List<Type>> GetAllConstructorParamTypes(MethodInfo methodInfo)
        {
            if (methodInfo.DeclaringType == null) 
            {
                return new List<List<Type>>();
            }
            return methodInfo.DeclaringType.GetConstructors().Select(constructor => constructor.GetParameters().Select(paramInfo => paramInfo.ParameterType).ToList()).ToList();
        }

        public static string[] GetUsedNamespaces(MethodInfo methodInfo)
        {
            List<string> namespaces = new List<string>();
            List<List<Type>> typesInConstructor = GetAllConstructorParamTypes(methodInfo);
            foreach (var paramsTypes in typesInConstructor)
            {
                foreach (var paramsType in paramsTypes)
                {
                    namespaces = namespaces.Concat(GetNamespaceFromType(paramsType)).ToList();
                }
            }
            if (methodInfo.DeclaringType != null) 
            {
                namespaces = namespaces.Concat(GetNamespaceFromType(methodInfo.DeclaringType)).ToList();
            }
            foreach (var paraInfo in methodInfo.GetParameters())
            {
                namespaces = namespaces.Concat(GetNamespaceFromType(paraInfo.ParameterType)).ToList();
            }
            namespaces = namespaces.Concat(GetNamespaceFromType(methodInfo.ReturnType)).ToList();
            return new HashSet<string>(namespaces).ToArray();
        }

        private static List<string> GetNamespaceFromType(Type inputType)
        {
            List<string> namespaces = new List<string>();
            if (inputType.IsGenericType)
            {
                foreach (var argument in inputType.GenericTypeArguments)
                {
                    namespaces = namespaces.Concat(GetNamespaceFromType(argument)).ToList();
                }
            } 
            else
            {
                if (inputType.Namespace != null) 
                {
                    namespaces.Add(inputType.Namespace);
                }
            }
            return namespaces;
        }

        private static string GetNormalTypeName(Type type)
        {
            if (typeNameConvertDict.ContainsKey(type.Name))
            {
                return typeNameConvertDict[type.Name];
            }

            // var typeName = string.IsNullOrWhiteSpace(type.FullName) ? type.Name : type.FullName;

            if (IsGeneric(type))
            {
                return type.Name.Substring(0, type.Name.IndexOf('`'));
            }
            else
            {
                return type.Name;
            }
        }

        private static string GetGenericType(IEnumerable<Type> argType)
        {
            return "<" + string.Join(", ", argType.Select(GetTypeSignature)) + ">";
        }

        private static bool IsGeneric(Type type)
        {
            return type.IsGenericType && type.Name.Contains("`");
        }
    }
}

#pragma warning disable IDE0057
#pragma warning disable CA1307
#pragma warning restore CS8632 // The annotation for nullable reference types should only be used in code within a '#nullable' annotations context.
#pragma warning restore CA1822 // Mark members as static
#pragma warning restore SA1600 // Elements should be documented
#pragma warning restore SA1516 // Elements should be separated by blank line
#pragma warning restore CA1819 // Mark members as static
#pragma warning restore CA1051 // Do not declare visible instance fields
#pragma warning restore SA1502 // Element should not be on a single line
#pragma warning restore SA1307 // Accessible fields should begin with upper-case letter
#pragma warning restore SA1515
#pragma warning restore CA1724
#pragma warning restore CA1801
#pragma warning restore CA1002
